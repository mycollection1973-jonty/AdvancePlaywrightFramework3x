# AdvancePlaywrightFramework3x

End-to-end test automation framework built on [Playwright Test](https://playwright.dev/) and TypeScript, with Page Object Model, data-driven readers and a self-contained HTML reporter.

## Stack

| Area | Tool |
| --- | --- |
| Test runner | `@playwright/test` |
| Language | TypeScript 7 (`npx tsc --noEmit` for a typecheck) |
| Env config | `dotenv` |
| Test data | `exceljs`, `js-yaml`, `csv-parse`, `mysql2`, `@faker-js/faker` |
| API / JSON checks | `jsonpath-plus`, `ajv` + `ajv-formats` |
| Logging & reporting | `winston`, `allure-playwright`, custom HTML reporter |

## Getting started

```bash
npm install
npx playwright install     # downloads chromium, firefox, webkit
```

Create a `.env` in the project root (see [Environment variables](#environment-variables)), then run the suite:

```bash
npx playwright test
```

## Project structure

```
src/
├── api/          API clients
├── config/       environment configuration
├── fixtures/     custom Playwright fixtures
├── pages/        Page Object Model
├── testdata/     test data
├── tests/        spec files
└── utils/        reusable utilities + CustomReporter
playwright.config.ts
tsconfig.json
.env                (gitignored)
```

Page objects currently cover the TTACart app: `LoginPage`, `InventoryPage` and `CartPage`.

## Custom reporter

`playwright.config.ts` runs every suite through `src/utils/CustomReporter.ts`, so you get a live report that updates as tests finish plus a final one:

```bash
npx playwright test
# report: tta-report/report_<runId>.html   (tta-report/index.html redirects to the latest)
```

It copies screenshots, video and trace attachments next to the report and exposes these tabs:

- **Test Results** — per-test steps, logs, timings and artifacts, with priority/status filters.
- **AI Verdict** — root-cause verdict for each failure (`src/ai/agents/rcaAgent.ts`).
- **Flaky** — pass/fail flips between this build and the previous one (`src/ai/agents/flakyAnalyzer.ts`); snapshots live in `reports/runs/`.
- **AI Data / Self-Heal** — populated only when a test attaches `ai-data` / `self-heal` attachments.

The AI verdicts and flaky list are rule-based and run fully offline; they need no API key. Attach a step screenshot with `shot()` from `src/utils/stepScreenshot.ts` and the reporter pins it to that step.

## Data-driven testing utilities

| File | Reads |
| --- | --- |
| `src/utils/csvReader.ts` | CSV files (sync) |
| `src/utils/excelReader.ts` | `.xlsx` worksheets (async, `exceljs`) |
| `src/utils/yamlReader.ts` | YAML lists (sync, so tests can be generated per row) |
| `src/utils/dbReader.ts` | MySQL via `mysql2` (async, needs the `MYSQL_*` env vars) |
| `src/utils/generateExcel.ts` | Writes the shared `login-data.xlsx` fixture |

## Environment variables

`.env` is gitignored — keep it local and never commit credentials.

| Variable | Purpose |
| --- | --- |
| `TTA_ENV` | Framework environment label (`qa`, `stg`, `prod`, `dev`) |
| `BASE_URL` | Default app URL |
| `QA_BASE_URL`, `STG_BASE_URL`, `PROD_BASE_URL`, `DEV_BASE_URL` | Per-environment URLs |
| `API_BASE_URL` | API under test |
| `LOG_LEVEL` | Logger verbosity |
| `TEST_ENV` | Environment shown in the report (defaults to `UAT`) |
| `TEST_AUTHOR` | Author shown in the report (defaults to `TTA-QA`) |
| `USERNAME`, `PASSWORD` | Default credentials |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Only for `dbReader.ts` |

`dotenv.config()` in `playwright.config.ts` is commented out — uncomment it (or import `dotenv/config` in a setup file) before relying on any of the values above.

## Useful commands

```bash
npx playwright test                          # all browsers, custom reporter
npx playwright test --project=chromium       # single browser
npx playwright test --ui                     # interactive UI mode
npx playwright test --reporter=list          # console only, writes no report
npx playwright show-report                   # built-in HTML reporter (when enabled)
npx tsc --noEmit                             # typecheck
```

> `npx playwright test --list` also triggers the custom reporter and writes an empty report plus a flaky snapshot — use `--reporter=list` when you only want to enumerate tests.
