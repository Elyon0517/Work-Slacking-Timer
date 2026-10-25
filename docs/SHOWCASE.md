# Browser walkthrough and screenshot capture

Verified locally on 2026-10-25 with Node 24 and headless Chromium. Python serves the static
page; Playwright is a development dependency only.

## Reproduce

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

The test command starts and stops a local HTTP server at `127.0.0.1:5191`; that port must be
available. CI runs the same suite on pull requests and pushes to main.

## What is exercised

- Three salary periods: 10 workdays per fortnight, 21 per month, 260 per year.
- CNY and USD earnings use one conversion; USD input no longer double-converts earnings.
- Paused wall-clock time is excluded after resuming.
- English and Chinese controls remain correct when starting and restarting.
- Empty, negative and out-of-range work hours disable the start button.
- Reaching the daily time limit stops the run; restarting clears elapsed time.
- Malformed exchange-rate data and network failures retain a valid, labeled fallback.
- Reloading resets inputs rather than saving salary.
- The timer and buttons fit a 390 × 844 viewport.
- No uncaught page exceptions occur during the tested interactions.

## Capture inputs

| Screenshot | Input / state |
|---|---|
| `setup-desktop.png` | CNY 21,000/month, 8 hours/day, before starting |
| `earnings-desktop.png` | Same inputs, 1:36:00 active time, CNY 200 estimated earnings |
| `earnings-mobile.png` | Same state at 390 × 844 |
| `setup-english.png` | English inputs: USD 2,000/fortnight, 8 hours/day |
| `earnings-mobile-english.png` | English USD 75 estimate at 390 × 844 |
| `earnings-english.png` | USD 2,000/fortnight, 8 hours/day; 3 active hours plus 1 excluded paused hour |

All are screenshots of the real page following actual input and button interactions.
Playwright advances the browser clock to avoid waiting hours and disables visual animations during capture for stable images. Only the external exchange-rate
response is replaced with a reproducible 7.2 CNY/USD fixture; the DOM and calculated results
are not fabricated. Salaries are synthetic examples.

The suite does not verify the provider's live data accuracy, real payroll calculations,
background-tab scheduling on every browser, or third-party hosting availability. Browser
traces and failure artifacts remain local/CI outputs and are not committed.
