// 16-11-2026

/**
 * A spec that fails on purpose.
 *
 * It exists so the custom report's AI Verdict tab has a real failure to triage — that
 * tab is driven by `analyzeFailure()`, which only runs when a test fails. Everything
 * before the failure is a normal flow, so the stack trace reads like a genuine bug.
 *
 * Do NOT "fix" the click below. When you want a green run, exclude this file:
 *   npx playwright test --grep-invert "fails on purpose"
 */

import { test } from '@fixtures/test-base';
import { visualStep } from '@utils/visualSteps';

const FIRST_ITEM_ID = 'test-allthethings-tshirt-red';

test.describe('@P0 @Regression E2E @Checkout AI Verdict demo', () => {

    test('fails on purpose: removes an item that was never added', async ({ page, validLogin, cartPage }) => {
        void validLogin;

        await visualStep(page, 'Cart page: remove an item that is not in the cart', async () => {
            await cartPage.open();

            // Deliberate failure: this test never adds anything to the cart, so the
            // remove button never appears and the action times out. A short timeout
            // keeps the demo quick.
            await page.locator(`[data-test="remove-${FIRST_ITEM_ID}"]`).click({ timeout: 2500 });
        });
    });
});
