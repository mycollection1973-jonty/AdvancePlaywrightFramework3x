/**
 * Build-vs-build comparison behind the report's "Flaky" tab.
 *
 * shortcut: the counts and the flaky list are a plain diff of the two runs; the
 * LLM summary is not produced yet, so the field stays empty and the tab shows
 * the counts and the list only.
 */

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timedOut';

export interface BuildSummary {
    runId: string;
    tests: Record<string, TestStatus>;
}

export interface FlakyResult {
    flaky: string[];
    counts: { flaky: number; failing: number; total: number };
    summary?: string;
}

const FAILED: TestStatus[] = ['failed', 'timedOut'];

export async function analyzeFlaky(
    prev: BuildSummary,
    curr: BuildSummary,
    _useAi: boolean,
): Promise<FlakyResult> {
    const titles = Object.keys(curr.tests);

    // Only a pass <-> fail flip counts as flaky; tests added or removed between
    // the two builds are not.
    const flaky = titles.filter((title) => {
        const before = prev.tests[title];
        const after = curr.tests[title];
        if (!before) return false;
        return (before === 'passed' && FAILED.includes(after)) || (FAILED.includes(before) && after === 'passed');
    });

    return {
        flaky,
        counts: {
            flaky: flaky.length,
            failing: titles.filter((title) => FAILED.includes(curr.tests[title])).length,
            total: titles.length,
        },
    };
}
