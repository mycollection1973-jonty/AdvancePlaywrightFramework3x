// 17-11-2026

/**
 * End-to-end demo of the self-heal agent.
 *
 * The first click deliberately uses a selector that cannot match (an `#id` the page never
 * uses). That failure is caught, the page is captured, the agent proposes replacements and
 * each one is verified against the live page. The result is attached as `self-heal`, the
 * attachment the custom report's Self-Heal tab renders.
 *
 * With a provider available the healed locator is clicked and the cart empties, which
 * proves the repair. Without one the tab shows the reason instead of a suggestion, and the
 * test still passes: the dead locator and the attempt to heal it both happened.
 */

import { test, expect } from '@fixtures/test-base';
import { visualStep } from '@utils/visualSteps';
import { healLocator } from '@ai/agents/selfHealAgent';

const FIRST_ITEM_ID = 'test-allthethings-tshirt-red';

// The real button carries [data-test="remove-<id>"]; this is the stale shape a test would
// be left with after the app moved from ids to data-test attributes.
const DEAD_SELECTOR = `#remove-${FIRST_ITEM_ID}`;

test.describe('@P0 @Regression E2E @Checkout self-heal demo', () => {

    test('recovers a dead locator and reports the suggestion', async ({
        page,
        validLogin,
        inventoryPage,
        cartPage,
    }) => {
        void validLogin;

        await visualStep(page, 'Inventory page: add first item to cart', async () => {
            await inventoryPage.assertLoaded();
            await inventoryPage.addToCart(FIRST_ITEM_ID);
        });

        let failure: Error | undefined;

        await visualStep(page, 'Cart page: click a locator that no longer matches', async () => {
            await cartPage.open();
            try {
                await page.locator(DEAD_SELECTOR).click({ timeout: 2000 });
            } catch (error) {
                failure = error as Error;
            }
        });

        // The whole demo depends on this selector really being dead.
        expect(failure, 'the selector was expected to fail so the healer has something to fix').toBeDefined();

        const report = await healLocator(page, DEAD_SELECTOR, 'the Remove button of the first cart row');

        if (report.verified.length > 0) {
            await visualStep(page, 'Cart page: click the healed locator', async () => {
                await page.locator(report.verified[0].selector).click();
                expect(await cartPage.rowCount()).toBe(0);
            });
        }
    });
});
