# AdvancePlaywrightFramework3x

End-to-end test automation framework built on [Playwright Test](https://playwright.dev/) and TypeScript: a Page Object Model over the TTACart demo app, data-driven readers, Winston logging and a self-contained HTML reporter.

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
├── ai/           reporter's AI helpers (RCA verdicts, flaky diff, provider check)
├── api/          API clients
├── config/       environment configuration
├── fixtures/     custom Playwright fixtures
├── pages/        Page Object Model (BasePage + TTACart pages)
├── testdata/     test data
├── tests/        spec files, e2e/ for the full checkout flow
└── utils/        locator wrapper, logger, data readers, CustomReporter
playwright.config.ts
tsconfig.json
.env                (gitignored)
```

## Architecture

**`BasePage`** — every page object extends it and inherits four things only: `page` (the Playwright handle), `el` (`UtilElementLocator` bound to the page), `log` (a `Logger` scoped to the subclass name) and `goto(relativePath)`. Subclasses declare their own `private readonly` locators; the base class deliberately builds none. Each page also exposes a `static readonly PATH` plus `open()` / `assertLoaded()`.

**`UtilElementLocator`** (`src/utils/UtilElementLocator.ts`) — one wrapper for the actions and assertions a suite repeats: `click`, `fill`, `type`/`pressSequentially`, `hover`, `getText`/`getAttr`/`getValue`, `count`, `isVisible`, `waitForVisible`/`waitForHidden`, `selectByText`/`selectByValue`/`selectByIndex`, and a `waitForPageLoad()`. Every target accepts a `Flex` — either a CSS/XPath string or an already-built `Locator` — and each action logs through the page's scoped logger with a 15s default timeout.

**`Logger`** (`src/utils/logger.ts`) — Winston, with a scoped child logger per page object so every line names its source:

```
2026-06-02 07:40:01 [info] [LoginPage] loginAs standard_user
```

Level comes from `LOG_LEVEL` (default `info`); output goes to the console and to `logs/combined.log`.

**Path alias** — pages and utils import the shared helpers as `@utils/...`, so `tsconfig.json` needs a matching `paths` mapping for both `tsc` and the Playwright runner to resolve them.

## Page objects

| Page | Covers |
| --- | --- |
| `LoginPage` | TTACart login form, credential errors |
| `InventoryPage` | Product list, sorting, add/remove from cart |
| `ItemDetailPage` | Single product view (`?id=...`) |
| `CartPage` | Cart contents, remove item, start checkout |
| `CheckoutStepOnePage` | Guest details form (`problem_user` quirk documented in the class) |
| `CheckoutStepTwoPage` | Order overview, subtotal/tax/total parsing, finish |
| `CheckoutCompletePage` | Order confirmation |

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
| `LOG_LEVEL` | Logger verbosity (`info` by default) |
| `TEST_ENV` | Environment shown in the report (defaults to `UAT`) |
| `TEST_AUTHOR` | Author shown in the report (defaults to `TTA-QA`) |
| `USERNAME`, `PASSWORD` | Default credentials |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Only for `dbReader.ts` |

Two config touches are still commented out in `playwright.config.ts`: enabling `dotenv.config()`, and setting `use.baseURL`. Page objects navigate with relative `PATH` values, so the suite needs `baseURL` (feed it from `BASE_URL`) before it can reach TTACart.

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
