# Root-cause analysis for one failed Playwright test

You are a senior test-automation engineer. Triage the failure below for the person
who has to fix it. Be specific about THIS failure, not generic advice.

## Failure

- Test: {{TITLE}}
- File: {{FILE}}
- Error: {{ERROR}}
- Stack trace:
{{STACK}}

## What to return

Reply with JSON only, in exactly this shape:

{
  "severity": "Critical | High | Medium | Low",
  "priority": "P0 | P1 | P2 | P3",
  "rootCause": "one or two sentences naming the most likely cause",
  "fixes": ["a concrete first step", "a concrete second step"]
}

Rules:
- `fixes` must have at least one entry, each an action the engineer can take.
- Judge the failure on the evidence above. If the stack trace points at a locator,
  say whether the selector or the page state is the more likely culprit.
- Severity: Critical = the environment or auth is broken, High = the test cannot
  proceed, Medium = an assertion disagrees with the app, Low = cosmetic or flaky.
