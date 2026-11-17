/**
 * Root-cause analysis for failed tests, rendered in the report's "AI Verdict" tab.
 *
 * The verdict comes from the LLM agent defined by `rca.prompt.md` + `rca.schema.json`
 * whenever a provider is configured. Anything going wrong on that path — no key, no
 * balance, a reply that misses the schema — falls back to the rule table below, so the
 * tab is never empty just because the provider was unavailable.
 */

import { createAgent } from './agentFactory';
import { isLLMConfigured } from '../LLMGateway';

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

/** Prompt + schema live in src/ai/prompts — see agentFactory.ts. */
const rcaLlm = createAgent<RcaVerdict>({ prompt: 'rca.prompt.md', schema: 'rca.schema.json' });

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

/**
 * Triage one failure. Prefers the LLM agent and falls back to the rule table, so a
 * missing key, an empty balance or a malformed reply still yields a verdict.
 */
export async function analyzeFailure(input: FailureInput): Promise<RcaVerdict> {
    if (isLLMConfigured()) {
        try {
            return await rcaLlm({
                TITLE: input.title,
                FILE: input.file,
                ERROR: input.error,
                STACK: input.stack ?? '(no stack trace captured)',
            });
        } catch (error) {
            console.warn(`RCA agent: LLM unavailable (${(error as Error).message}); using the rule table.`);
        }
    }
    return fromRules(input);
}

/** Offline fallback: the first rule whose pattern appears in the error or the stack. */
function fromRules(input: FailureInput): RcaVerdict {
    const haystack = `${input.error}\n${input.stack ?? ''}`;
    const rule = RULES.find((r) => r.pattern.test(haystack)) ?? FALLBACK;
    return {
        severity: rule.severity,
        priority: rule.priority,
        rootCause: rule.rootCause,
        fixes: rule.fixes,
    };
}
