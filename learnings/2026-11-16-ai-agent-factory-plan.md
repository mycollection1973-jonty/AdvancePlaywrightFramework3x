# Plan: an AI agent factory in the Playwright framework

**Goal:** the framework gains AI help in four places — test data, failure triage, flaky
analysis, self-healing locators — without four separate integrations. Every agent is a
**prompt file plus an output schema**. Adding a fifth agent should mean writing two files,
not new plumbing.

## What already exists (do not rebuild)

| Piece | Where | Why it matters |
| --- | --- | --- |
| Provider-agnostic gateway | `src/ai/LLMGateway.ts` | Retries, timeouts, tolerant JSON parsing, allowlist. Agents never talk to a provider directly. |
| Agent factory | `src/ai/agents/agentFactory.ts` | `createAgent({ prompt, schema })` → a typed function. **Built in this session.** |
| The four report tabs | `src/utils/CustomReporter.ts` | Already consume the data — AI Data, AI Verdict, Flaky, Self-Heal. They need **no changes**. |
| Offline implementations | `rcaAgent.ts`, `flakyAnalyzer.ts`, `utils/selfHeal.ts` | Each becomes the fallback rather than being deleted. |
| Prompt convention | `src/ai/prompts/` | `*.prompt.md` with `{{SLOTS}}` plus `*.schema.json`. |

The important discovery: the reporter's plumbing is complete. It already listens for an
`ai-data` attachment and builds verdicts through `analyzeFailure()`. So the work is
**feeding existing paths**, not building new ones.

## The contract every agent implements

```ts
const rca = createAgent<RcaVerdict>({ prompt: 'rca.prompt.md', schema: 'rca.schema.json' });
const verdict = await rca({ TITLE: test.title, ERROR: error.message, STACK: stack });
```

Four rules keep it honest:

1. The prompt is a **file**, with `{{PLACEHOLDER}}` slots the caller fills. Vary the prompt
   per call or the model repeats itself — that lesson is in the gateway write-up.
2. The reply is **validated against the schema** before anyone sees it (Ajv, already a
   dependency). A model that invents fields fails at the agent with a readable message
   instead of confusing the report.
3. The agent **throws** on any failure — no key, no balance, bad reply.
4. The **caller decides the fallback**. That is what keeps the report useful offline.

## The four agents

| Agent | Prompt + schema | Feeds | Offline fallback |
| --- | --- | --- | --- |
| **DataGen** | `checkoutCustomer.prompt.md` + `.schema.json` | `ai-data` attachment → AI Data tab | `DataGenerator.checkoutCustomer()` (Faker) |
| **RCA** | `rca.prompt.md` + `rca.schema.json` | `analyzeFailure()` → AI Verdict tab | The rule table in `rcaAgent.ts` |
| **Flaky** | `flaky.prompt.md` + `flaky.schema.json` | `FlakyResult.summary` → Flaky tab | Today's counts-only diff |
| **Self-heal** | `selfheal.prompt.md` + `selfheal.schema.json` | `self-heal` attachment → Self-Heal tab | Today's locator scan |

RCA and DataGen are the two already wired end to end in this session; Flaky and Self-heal
are the "after words" pair.

## Where each piece lives

```
src/ai/
├── LLMGateway.ts              provider-agnostic, unchanged
├── agents/
│   ├── agentFactory.ts        prompt + schema -> typed function        [done]
│   ├── rcaAgent.ts            LLM first, rule table fallback           [done]
│   └── flakyAnalyzer.ts       fill the `summary` it already declares
├── prompts/
│   ├── checkoutCustomer.prompt.md      exists
│   ├── rca.prompt.md / rca.schema.json [done]
│   └── flaky.* / selfheal.*            to write
└── ...
src/utils/selfHeal.ts          keep, gains an agent in front of it
```

## Order of work

1. **Factory + RCA** — done. `analyzeFailure()`'s signature was deliberately left alone so
   `CustomReporter` needed zero edits.
2. **DataGen** — route the spec's prompt through the factory and attach the result as
   `ai-data`, which is the exact name the AI Data tab reads.
3. **A deliberately failing spec** — `src/tests/aiTests/e2e-checkout-failure.spec.ts`, one
   test that fails on purpose so the AI Verdict tab has something to triage.
4. **Flaky** — `analyzeFlaky(prev, curr, useAi)` already takes a `useAi` flag that is
   ignored and a `summary` field that is never filled. Both are the hooks; the factory
   fills them.
5. **Self-heal** — run the agent when a locator fails, and attach the result as `self-heal`
   so the tab renders verified vs rejected candidates.
6. **One test per agent** — the failing spec for RCA, two consecutive runs for Flaky, a
   removed attribute for Self-heal.

## Judgment calls

- **The fallbacks stay.** With no key, no balance or a malformed reply the report still
  fills its tabs from the offline path. This is not a nicety: the DeepSeek account here is
  at $0.00, and that is exactly why the Verdict tab can be demonstrated today.
- **No agent classes, no registry, no config.** One function, two files per agent.
- **No schema-free agents.** A prompt without a schema is how a model's stray field breaks a
  report tab two steps later.
- **One prompt per agent, not one prompt to rule them all.** Different jobs, different
  slots, independently tunable.
- **Do not use the LLM for anything deterministic.** Counting flaky tests is a diff; only
  the *explanation* is worth a model call.

## How to verify without spending money

`LLMGateway` accepts a `baseUrl` override, so a throwaway spec can point every agent at a
local `http.createServer` mock. That checks the request shape, the placeholder
substitution, the schema validation and the fallback path with no key and no cost. Then a
single free Groq key exercises the real thing end to end.

## Reusable rule

An AI feature is a **prompt plus an output schema**, and the code around it only decides
where the result goes and what happens when it fails. Build the factory first, keep every
existing offline implementation as the fallback, and feed the surfaces that already
exist — the report needed no changes to gain four agents.
