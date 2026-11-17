# Flaky detection with DeFlaky

**Problem:** run one spec repeatedly, let a tool decide which tests are flaky, and see the
score locally and on a hosted dashboard — without changing how the suite normally runs.

## The spec that is flaky on purpose

`src/tests/aiTests/e2e-checkout-flaky.spec.ts`

It alternates **deterministically** rather than randomly: a counter in the OS temp folder
flips the expectation, so even runs expect 1 cart row and odd runs expect 2. Randomness
makes a bad demo — two runs have a ~25% chance of agreeing, and then nothing is detected
at all. Skip it when you want a clean run:

```bash
npx playwright test --grep-invert "flaky on purpose"
```

## Commands

```powershell
# The CLI reads the process environment, not .env, so pull the token out first.
$token = ((Get-Content .env | Where-Object { $_ -match '^\s*DEFLAKY_API_KEY\s*=' }) -split '=',2)[1].Trim()

# Playwright must write a JSON *file* - DeFlaky parses report files, never stdout.
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results/playwright-results.json'

deflaky run -c "npx playwright test src/tests/aiTests/e2e-checkout-flaky.spec.ts --reporter=json" -r 2 --push -t $token
```

What that produces:

```
Total tests: 1     Stable: 0     Flaky: 1     FlakeScore: 0.0%

│ flaky on purpose… │ aiTests/e2e-checkout-f… │ 50% │ Pass 1 │ Fail 1 │ Runs 2 │

Results saved to .deflaky\last-run.json
Pushing results to DeFlaky dashboard...
  Results pushed successfully!
```

FlakeScore is `stable / total * 100`, so a suite whose only test is flaky scores 0 — a
flaky test is never stable. Add stable specs and the score climbs.

## Local dashboard

```powershell
deflaky serve                 # http://localhost:3333 — reads .deflaky/last-run.json
deflaky serve -p 4000         # different port
deflaky serve -t <token>      # adds the AI root-cause analysis of the failures
```

Verified after a run: `curl http://localhost:3333` returns `HTTP 200`.

## The installed CLI (v1.1.2) differs from the website docs

Read `deflaky run --help` on the machine, not the docs page. They disagree:

| | Installed v1.1.2 | Website docs |
| --- | --- | --- |
| test command | `-c, --command <cmd>` | `-- <cmd>` |
| `-t` | **token** | threshold |
| threshold | `--fail-threshold` | `-t` |
| token env var | **`DEFLAKY_TOKEN`** | `DEFLAKY_API_TOKEN` |

## Two things that block the first run

1. **No JSON reporter.** The first attempt printed `Total tests: 0` and the push failed
   with `400: totalTests is required and must be a non-negative number`. This project's
   reporters are `line + allure + CustomReporter` — no JSON — and DeFlaky reads report
   **files**. From its `dist/runner.js`: it scans `test-results/`, `reports/`, `results/`,
   `output/`, `build/…`, `target/…` and takes any `.json` whose filename contains
   `test`, `result` or `report`. Hence `--reporter=json` plus `PLAYWRIGHT_JSON_OUTPUT_NAME`
   pointing at `test-results/`.
2. **The CLI never reads `.env`.** It uses the process environment (`env: {...process.env}`
   when spawning your command). In v1.1.2 the variable is `DEFLAKY_TOKEN`; ours is
   `DEFLAKY_API_KEY`, which matches no version — so pass `-t` explicitly, or rename the key
   and export it.

## Judgment calls (what was NOT done)

- **`playwright.config.ts` was left alone.** Adding `['json', { outputFile: … }]` to the
  reporters would make a bare `deflaky run -c "npx playwright test"` work with no extra
  flags, but it would also write a JSON file on every ordinary run. Passing `--reporter=json`
  on the wrapped command keeps the change local to the flaky check — and makes that run
  faster, since it skips the custom reporter and allure.
- **No `-r 5`.** Two runs is the minimum that can show a flip, and the spec guarantees one.
  More runs give a smoother score but cost time.
- **No `--fail-threshold`.** It exits 1 when the score is too low; useful in CI, noisy while
  learning.

## Reusable rule

A wrapper CLI can only see what your runner writes to disk. Before blaming the tool, check
(a) which report files it scans, (b) that your config produces one, and (c) that it reads
the environment rather than your `.env`. Version drift between a CLI and its docs is normal
— `--help` on the installed binary is the source of truth.
