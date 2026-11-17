// 17-11-2026

/**
 * Self-heal agent — when a locator finds nothing, ask the model for replacements, then
 * verify each one against the live page before believing it.
 *
 * Prompt + schema: `src/ai/prompts/selfheal.*`.
 *
 * The return value is the `HealReport` that `CustomReporter`'s Self-Heal tab renders, and
 * it is attached as `self-heal` — the attachment name that tab listens for. Match counts
 * and visibility come from the page, never from the model.
 */

import { test, type Page } from '@playwright/test';
import { createAgent } from './agentFactory';
import type { HealCandidate, HealReport, RejectedCandidate } from '@utils/selfHeal';

interface Suggestion {
    selector: string;
    strategy: string;
    reasoning: string;
}

const selfHealLlm = createAgent<{ candidates: Suggestion[] }>({
    prompt: 'selfheal.prompt.md',
    schema: 'selfheal.schema.json',
});

/**
 * The interactive elements only, one per line. A whole `page.content()` is tens of
 * kilobytes of markup and scripts; the model only needs what it can point a locator at.
 */
async function capturePage(page: Page): Promise<string> {
    return page.evaluate(() => {
        const nodes = Array.from(
            document.querySelectorAll('[data-test], button, a, input, select, textarea'),
        ).slice(0, 300);

        return nodes
            .map((el) => {
                const attrs = Array.from(el.attributes)
                    .map((attribute) => `${attribute.name}="${attribute.value}"`)
                    .join(' ');
                const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
                return `<${el.tagName.toLowerCase()} ${attrs}>${text}`;
            })
            .join('\n');
    });
}

/** How many elements a selector reaches, and whether the single one is visible. */
async function verify(page: Page, selector: string): Promise<{ matchCount: number; visible: boolean }> {
    const locator = page.locator(selector);
    const matchCount = await locator.count();
    const visible = matchCount === 1 ? await locator.first().isVisible() : false;
    return { matchCount, visible };
}

async function attach(report: HealReport): Promise<void> {
    await test.info().attach('self-heal', {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
    });
}

/**
 * Capture the page, ask the agent for replacements, verify them, and attach the report.
 * A dead provider is not an error here: the report says why in `unavailableReason`, which
 * is what the tab shows instead of a suggestion.
 */
export async function healLocator(page: Page, failedSelector: string, intent: string): Promise<HealReport> {
    const base = { failedSelector, intent };

    let suggestions: Suggestion[];
    try {
        const reply = await selfHealLlm({
            FAILED_SELECTOR: failedSelector,
            INTENT: intent,
            PAGE: await capturePage(page),
        });
        suggestions = reply.candidates;
    } catch (error) {
        const report: HealReport = {
            ...base,
            verified: [],
            rejected: [],
            unavailableReason: (error as Error).message,
        };
        await attach(report);
        return report;
    }

    const verified: HealCandidate[] = [];
    const rejected: RejectedCandidate[] = [];

    for (const suggestion of suggestions) {
        try {
            const result = await verify(page, suggestion.selector);
            if (result.matchCount === 1) {
                verified.push({
                    selector: suggestion.selector,
                    strategy: suggestion.strategy,
                    reasoning: suggestion.reasoning,
                    ...result,
                });
            } else {
                rejected.push({
                    selector: suggestion.selector,
                    reason: `matched ${result.matchCount} element(s) on the page`,
                });
            }
        } catch (error) {
            rejected.push({
                selector: suggestion.selector,
                reason: `not a usable selector: ${(error as Error).message.split('\n')[0]}`,
            });
        }
    }

    const report: HealReport = { ...base, verified, rejected };
    await attach(report);
    return report;
}
