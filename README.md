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
npx playwright install     # downloads the browsers; chromium is the only project enabled
```

Create a `.env` in the project root (see [Environment variables](#environment-variables)), then run the suite:

```bash
npx playwright test
```

## Project structure

```
src/
├── ai/           reporter's AI helpers (rule-based RCA verdicts, flaky diff, provider check)
├── api/          API clients (placeholder — .gitkeep only)
├── config/       `env.ts` (`envOr`), `credentials.ts`, per-environment URLs
├── fixtures/     custom Playwright fixtures (`test-base.ts`)
├── pages/        Page Object Model (BasePage + TTACart pages)
├── testdata/     test data (`logintestdata.json`)
├── tests/        spec files, `e2e/` for the end-to-end flows
└── utils/        locator wrapper, logger, `visualSteps`, `DataGenerator`, data readers, CustomReporter
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

## Fixtures

Specs import `test` from `src/fixtures/test-base.ts` rather than `@playwright/test`. It hands over every page object already built against the test's `page`, plus ready-made states so setup is not repeated in each spec:

| Fixture | What the test receives |
| --- | --- |
| `loginPage`, `inventoryPage`, `itemDetailPage`, `cartPage`, `checkoutStepOnePage`, `checkoutStepTwoPage`, `checkoutCompletePage` | The page object, constructed but not navigated |
| `validLogin` | `LoginPage`, already signed in as `standard_user` and the login button gone |
| `invalidLogin` | `{ loginPage, username }` for `locked_out_user`, with the error box visible |
| `loginWithInventory` | `InventoryPage`, signed in and loaded |
| `loginWithSelectedItem` | `{ inventoryPage, itemId }`, signed in with the first item already in the cart |

State fixtures run only when a test asks for one, and they compose: `loginWithSelectedItem` depends on `loginWithInventory`, which depends on `validLogin`. So requesting `validLogin` **is** the login step — there is no separate setup call in the spec.

Logins here read `src/testdata/logintestdata.json`; use `credentials` from `src/config/credentials.ts` when you want the `.env` values instead.

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

### Pinning a screenshot to a step

Wrap a stage in `visualStep` (`src/utils/visualSteps.ts`) and the reporter hangs the screenshot on that step:

```ts
await visualStep(page, 'Open the cart', async () => {
    await cartPage.open();
});
```

Two things to know:

- Nothing is attached unless `ATTACH_SCREENSHOTS=true` is set. The flag is read once when the module loads.
- The reporter matches an attachment named `step-<index>-<slug>` to the step at that zero-based index, and `visualStep` counts only its own calls. So **every** `test.step` in a spec has to be a `visualStep`; drop in a plain one and every later screenshot lands on the wrong step.

`shot()` in `src/utils/stepScreenshot.ts` is the manual version — it takes the index you pass it, for one-off captures outside a `visualStep`.

Both AI passes are rule-based and offline: the verdicts come from a pattern table in `rcaAgent.ts`, and the flaky tab is a plain diff of two runs, so neither makes a network call. The reporter still gates the verdict pass behind an API key — `hasApiKey()` in `src/ai/config/providers.ts` looks for `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — so without one the AI Verdict tab stays empty.

## Data-driven testing utilities

| File | Reads |
| --- | --- |
| `src/utils/csvReader.ts` | CSV files (sync) |
| `src/utils/excelReader.ts` | `.xlsx` worksheets (async, `exceljs`) |
| `src/utils/yamlReader.ts` | YAML lists (sync, so tests can be generated per row) |
| `src/utils/dbReader.ts` | MySQL via `mysql2` (async, needs the `MYSQL_*` env vars) |
| `src/utils/generateExcel.ts` | Writes the shared `login-data.xlsx` fixture |
| `src/utils/DataGenerator.ts` | Faker-backed fakes — `checkoutCustomer()`, `credentials()`, `userProfile()` and friends |

## Environment variables

`.env` is gitignored — keep it local and never commit credentials. Read values through `envOr(key, fallback)` in `src/config/env.ts`, so a missing or blank variable falls back instead of arriving as `undefined`.

| Variable | Purpose |
| --- | --- |
| `TTA_ENV` | Framework environment label (`qa`, `stg`, `prod`, `dev`) |
| `BASE_URL` | Default app URL — wins over the per-environment values below |
| `QA_BASE_URL`, `STG_BASE_URL`, `PROD_BASE_URL`, `DEV_BASE_URL` | Per-environment URLs |
| `API_BASE_URL` | API under test |
| `LOG_LEVEL` | Logger verbosity (`info` by default) |
| `TEST_ENV` | Environment shown in the report (defaults to `UAT`) |
| `TEST_AUTHOR` | Author shown in the report (defaults to `TTA-QA`) |
| `USERNAME`, `PASSWORD` | Default credentials |
| `STANDARD_USER`, `TTA_SECRET` | Credentials used by `src/config/credentials.ts` (defaults `standard_user` / `tta_secret`) |
| `ATTACH_SCREENSHOTS` | `true` makes `visualStep` attach a screenshot per step |
| `CHECKOUT_FIRST_NAME`, `CHECKOUT_LAST_NAME`, `CHECKOUT_POSTAL_CODE` | Optional overrides for `DataGenerator.checkoutCustomerFromEnv()` |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Only for `dbReader.ts` |

`playwright.config.ts` loads `.env` with `dotenv` at startup and sets `use.baseURL` from `resolveBaseURL()` — `BASE_URL` first, otherwise the per-environment URL for `TTA_ENV`. Page objects navigate with relative `PATH` values, so `baseURL` is what makes them reach TTACart. Runs are headed locally and headless in CI (`headless: !!process.env.CI`), with one worker and two retries on CI.

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
