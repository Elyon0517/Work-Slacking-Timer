const { test, expect } = require('@playwright/test');
const { mkdirSync } = require('node:fs');
const hour = 3600000;
const instant = new Date('2026-10-25T14:00:00Z');

async function open(page, { rate = 7.2, response = null } = {}) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: instant });
  await page.clock.pauseAt(instant);
  await page.route('https://api.exchangerate-api.com/**', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().postData()).toBeNull();
    await route.fulfill({ json: response ?? { rates: { CNY: rate } } });
  });
  await page.goto('/');
  await expect(page.locator('#rateNote')).toContainText('7.2000');
  return errors;
}

async function start(page, amount, period = 'monthly', hours = '8') {
  await page.locator('#salaryAmount').fill(amount);
  await page.locator('#workHours').fill(hours);
  await page.locator('#salaryType').selectOption(period);
  await page.getByRole('button', { name: /开始计时|Start Timer/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('Chinese walkthrough, correct monthly earnings and desktop captures', async ({ page }) => {
  const errors = await open(page);
  await page.locator('#salaryAmount').fill('21000');
  await page.locator('#workHours').fill('8');
  await page.locator('#salaryType').selectOption('monthly');
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/setup-desktop.png' });
  await page.getByRole('button', { name: '开始计时', exact: true }).click();
  await page.clock.fastForward(5760000);
  await expect(page.locator('#fullDialogSalary')).toHaveText('¥200.00 ($27.78)');
  await expect(page.locator('#fullDialogTime')).toHaveText('01:36:00');
  await expect(page.locator('#fullDialogPerHour')).toHaveText('¥125.00 ($17.36)');
  await expect(page.locator('#currencySuffix')).toBeDisabled();
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/earnings-desktop.png' });
  expect(errors).toEqual([]);
});

for (const [period, amount] of [['biweekly', '8000'], ['monthly', '16800'], ['yearly', '208000']]) {
  test(`${period} uses its documented workday divisor`, async ({ page }) => {
    const errors = await open(page);
    await start(page, amount, period);
    await page.clock.fastForward(hour);
    await expect(page.locator('#fullDialogSalary')).toHaveText('¥100.00 ($13.89)');
    await expect(page.locator('#fullDialogPerDay')).toHaveText('¥800.00 ($111.11)');
    expect(errors).toEqual([]);
  });
}

test('USD is converted once and pause/resume excludes paused time', async ({ page }) => {
  const errors = await open(page);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Switch salary currency' }).click();
  await start(page, '2000', 'biweekly');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.clock.fastForward(2 * hour);
  await expect(page.locator('#fullDialogSalary')).toHaveText('$50.00 (¥360.00)');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.fastForward(hour);
  await expect(page.locator('#fullDialogTime')).toHaveText('02:00:00');
  await expect(page.locator('#fullDialogSalary')).toHaveText('$50.00 (¥360.00)');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.fastForward(hour);
  await expect(page.locator('#fullDialogTime')).toHaveText('03:00:00');
  await expect(page.locator('#fullDialogSalary')).toHaveText('$75.00 (¥540.00)');
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/earnings-english.png' });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start Timer', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('#salaryAmount')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('invalid inputs stay disabled; a finished workday stops and a restart resets time', async ({ page }) => {
  const errors = await open(page);
  const button = page.getByRole('button', { name: '开始计时', exact: true });
  await expect(button).toBeDisabled();
  await page.locator('#salaryAmount').fill('-1');
  await page.locator('#workHours').fill('8');
  await expect(button).toBeDisabled();
  await page.locator('#salaryAmount').fill('1000');
  await page.locator('#workHours').fill('25');
  await expect(button).toBeDisabled();
  await page.locator('#workHours').fill('1');
  await button.click();
  await page.clock.fastForward(hour);
  await expect(page.getByRole('dialog')).toBeHidden();
  await button.click();
  await expect(page.locator('#fullDialogTime')).toHaveText('00:00:00');
  expect(errors).toEqual([]);
});

test('malformed exchange data keeps a valid visible fallback', async ({ page }) => {
  const errors = await open(page, { response: { rates: {} } });
  await expect(page.locator('#rateNote')).toContainText('备用参考汇率');
  await start(page, '16800');
  await page.clock.fastForward(hour);
  await expect(page.locator('#fullDialogSalary')).toHaveText('¥100.00 ($13.89)');
  expect(errors).toEqual([]);
});

test('a failed rate request still allows the timer to run', async ({ page }) => {
  await open(page);
  await page.unroute('https://api.exchangerate-api.com/**');
  await page.route('https://api.exchangerate-api.com/**', route => route.abort());
  await page.reload();
  await expect(page.locator('#rateNote')).toContainText('备用参考汇率');
  await start(page, '16800');
  await page.clock.fastForward(hour);
  await expect(page.locator('#fullDialogSalary')).toHaveText('¥100.00 ($13.89)');
});

test('mobile walkthrough fits a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await open(page);
  await start(page, '21000');
  await page.clock.fastForward(5760000);
  await expect(page.locator('#fullDialogSalary')).toHaveText('¥200.00 ($27.78)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const buttons = page.locator('.dialog-actions');
  const box = await buttons.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/earnings-mobile.png' });
  expect(errors).toEqual([]);
});
