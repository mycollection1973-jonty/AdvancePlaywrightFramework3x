/**
 * Root-cause analysis for failed tests, rendered in the report's "AI Verdict" tab.
 *
 * shortcut: verdicts come from the rule table below, not from an LLM. Swap the
 * rules for a provider call (see ../config/providers) once a key is wired up.
 */

export interface FailureInput {
    title: string;
    file: string;
    error: string;
    stack?: string;
}

export interface RcaVerdict {
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    priority: string;
    rootCause: string;
    fixes: string[];
}

interface Rule {
    pattern: RegExp;
    severity: RcaVerdict['severity'];
    priority: string;
    rootCause: string;
    fixes: string[];
}

const RULES: Rule[] = [
    {
        pattern: /strict mode violation|resolved to \d+ elements/i,
        severity: 'High',
        priority: 'P1',
        rootCause: 'The locator matched more than one element, so Playwright refused to act on it.',
        fixes: [
            'Narrow the locator with .first(), .nth() or a more specific role/name.',
            'Add a unique data-test attribute to that element in the app.',
        ],
    },
    {
        pattern: /timeout \d+ms exceeded|timed out/i,
        severity: 'High',
        priority: 'P1',
        rootCause: 'The action or assertion never settled before the timeout expired.',
        fixes: [
            'Wait for a concrete condition (response, visible text) instead of a fixed delay.',
            'Re-check the locator against the current DOM before raising the timeout.',
        ],
    },
    {
        pattern: /waiting for locator|element is not attached|target closed/i,
        severity: 'High',
        priority: 'P1',
        rootCause: 'The page never produced the element the locator points at, so the selector has most likely drifted from the DOM.',
        fixes: [
            'Verify the selector against a live page with the Playwright Inspector.',
            'Prefer getByRole/getByTestId over CSS chains.',
        ],
    },
    {
        pattern: /toHaveTitle|toBeVisible|toHaveText|toHaveValue|toHaveCount/i,
        severity: 'Medium',
        priority: 'P2',
        rootCause: 'An assertion failed: the application returned something other than the expected value.',
        fixes: [
            'Confirm the expected value still matches the application behaviour.',
            'If the app changed on purpose, update the assertion.',
        ],
    },
    {
        pattern: /net::ERR|ECONNREFUSED|ENOTFOUND|socket hang up|\b(401|403|500|502|503)\b/i,
        severity: 'Critical',
        priority: 'P0',
        rootCause: 'The request failed at the network or authentication layer, so the page under test never loaded.',
        fixes: [
            'Check that the target environment is up and reachable from the runner.',
            'Refresh the credentials/session the test logs in with.',
        ],
    },
];

const FALLBACK: Omit<Rule, 'pattern'> = {
    severity: 'Medium',
    priority: 'P2',
    rootCause: 'The failure text does not match a known pattern.',
    fixes: ['Read the top framework frame of the stack trace, then inspect the artifacts captured around it.'],
};

export async function analyzeFailure(input: FailureInput): Promise<RcaVerdict> {
    const haystack = `${input.error}\n${input.stack ?? ''}`;
    const rule = RULES.find((r) => r.pattern.test(haystack)) ?? FALLBACK;
    return {
        severity: rule.severity,
        priority: rule.priority,
        rootCause: rule.rootCause,
        fixes: rule.fixes,
    };
}
