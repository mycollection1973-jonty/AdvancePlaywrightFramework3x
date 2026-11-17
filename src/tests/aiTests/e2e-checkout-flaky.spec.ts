// 17-11-2026

/**
 * A spec that is flaky on purpose.
 *
 * DeFlaky (`deflaky run --runs N -- npx playwright test`) compares the result of every
 * repeat and needs a test that changes its answer. Randomness makes a poor demo — two
 * runs can both pass — so this one alternates deterministically: the counter in the OS
 * temp folder survives between runs and never touches the repo.
 *
 * Do NOT "fix" this test. When you want a deterministic run, skip it:
 *   npx playwright test --grep-invert "flaky on purpose"
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@fixtures/test-base';
import { visualStep } from '@utils/visualSteps';

// First product card on the TTACart inventory page.
const FIRST_ITEM_ID = 'test-allthethings-tshirt-red';

const COUNTER = join(tmpdir(), 'tta-flaky-demo-count.txt');

/** How many times this test has run before, then records this run. */
function runNumber(): number {
    const previous = existsSync(COUNTER) ? Number(readFileSync(COUNTER, 'utf8')) : 0;
    writeFileSync(COUNTER, String(previous + 1));
    return previous;
}

test.describe('@P0 @Regression E2E @Checkout flaky demo', () => {

    test('flaky on purpose: cart row count alternates between runs', async ({
        page,
        validLogin,
        inventoryPage,
        cartPage,
    }) => {
        void validLogin;

        const run = runNumber();
        // Even runs expect the truth; odd runs expect a wrong number, so the
        // test fails. One item really is added either way.
        const expected = run % 2 === 0 ? 1 : 2;

        await visualStep(page, 'Inventory page: add first item to cart', async () => {
            await inventoryPage.assertLoaded();
            await inventoryPage.addToCart(FIRST_ITEM_ID);
        });

        await visualStep(page, 'Cart page: assert the row count', async () => {
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(expected);
        });
    });
});
