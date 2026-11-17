# Suggest a replacement for a dead Playwright locator

A test tried to reach an element with the selector below and found nothing. Propose
selectors that reach the SAME element on the captured page, best first.

## What the test meant to reach
{{INTENT}}

## The selector that failed
{{FAILED_SELECTOR}}

## The page at the moment of failure
One interactive element per line, as `<tag attributes>text`.
{{PAGE}}

## What to return

Reply with JSON only, in exactly this shape:

{
  "candidates": [
    {
      "selector": "a Playwright selector string",
      "strategy": "one of: data-test, role, text, id, css",
      "reasoning": "one sentence on why this reaches the same element"
    }
  ]
}

Rules:
- Prefer a stable `data-test` attribute, then role + accessible name, then visible text,
  then id, then a css path. Say which one you used in `strategy`.
- Only use attribute values and text that actually appear in the capture. Never invent one.
- Return the best 1 to 3 candidates. An empty list is acceptable when nothing fits.
