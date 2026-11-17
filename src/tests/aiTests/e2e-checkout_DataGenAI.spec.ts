// 27-10-2026
// created in class not mine

/**
 * Checkout E2E built on the login fixtures from test-base:
 *   - validLogin:   standard_user buys one item and completes checkout.
 *   - invalidLogin: locked_out_user is stopped at the login page.
 *
 * Customer details come from the DataGen agent (prompt + schema in src/ai/prompts).
 * Faker stands in when the provider is unavailable, and the report's AI Data tab shows
 * which of the two answered.
 */

import { test, expect } from '@fixtures/test-base';
import { DataGenerator } from '@utils/DataGenerator';
import { visualStep } from '@utils/visualSteps';
import { checkoutCustomerAgent } from '@ai/agents/dataAgent';
import { isLLMConfigured } from '@ai/LLMGateway';

// First product card on the TTACart inventory page.
const FIRST_ITEM_ID = 'test-allthethings-tshirt-red';

interface CheckoutCustomer {
    firstName: string;
    lastName: string;
    postalCode: string;
}

test.describe('@P0 @Regression E2E @Checkout Checkout Feature', () => {
    // Each step ends on the page in its title, so its screenshot shows that page.
    test('should complete checkout successfully', async ({
        page,
        validLogin, // logs in as standard_user before the test body runs
        inventoryPage,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
        checkoutCompletePage,
    }) => {
        test.skip(!isLLMConfigured(), 'Configure LLM_PROVIDER, LLM_MODEL, and its API key to run this AI test.');

        await visualStep(page, 'Inventory page: add first item to cart', async () => {
            await inventoryPage.assertLoaded();
            await inventoryPage.addToCart(FIRST_ITEM_ID);
        });

        await visualStep(page, 'Cart page: verify one item in cart', async () => {
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(1);
        });

        await visualStep(page, 'Checkout step one: enter customer details', async () => {
            await cartPage.checkout();
            await checkoutStepOnePage.assertLoaded();

            const firstInitial = DataGenerator.firstName().charAt(0).toUpperCase();
            const lastInitial = DataGenerator.lastName().charAt(0).toUpperCase();

            // The DataGen agent is the AI path; Faker is the offline fallback so a
            // provider outage does not fail the checkout. `source` travels into the
            // report with the data, so the AI Data tab never overstates itself.
            let source = 'llm';
            let customer: CheckoutCustomer;
            try {
                customer = await checkoutCustomerAgent({
                    FIRST_INITIAL: firstInitial,
                    LAST_INITIAL: lastInitial,
                    STATE: 'California',
                });
            } catch (error) {
                source = 'faker-fallback';
                console.warn(`DataGen agent unavailable: ${(error as Error).message} — using Faker data.`);
                customer = DataGenerator.checkoutCustomer();
            }

            if (source === 'llm') {
                // The prompt asked for these initials, so hold the model to them.
                // The schema already checked the format of all three fields.
                expect(customer.firstName.startsWith(firstInitial)).toBe(true);
                expect(customer.lastName.startsWith(lastInitial)).toBe(true);
            }

            // `ai-data` is the attachment name the custom reporter's AI Data tab reads.
            await test.info().attach('ai-data', {
                body: JSON.stringify({ source, customer }, null, 2),
                contentType: 'application/json',
            });

            await checkoutStepOnePage.fillGuest(customer);
        });

        await visualStep(page, 'Checkout step two: review order overview', async () => {
            await checkoutStepOnePage.continue();
            await checkoutStepTwoPage.assertLoaded();
        });

        await visualStep(page, 'Checkout complete: finish and verify confirmation', async () => {
            await checkoutStepTwoPage.finish();
            await checkoutCompletePage.assertOrderComplete();
        });
    });

    test('should reject login for a locked-out user', async ({ page, invalidLogin }) => {
        // invalidLogin has already submitted the form and waited for the error box.
        const { loginPage, username } = invalidLogin;
        await visualStep(page, `Login page: ${username} sees locked-out error`, async () => {
            await loginPage.expectedErrorContains('locked out');
            await expect(page).not.toHaveURL(/inventory/);
        });
    });
});
