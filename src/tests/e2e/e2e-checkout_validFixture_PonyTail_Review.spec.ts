// 27-10-2026
// created by AI
/**
 * E2E checkout — signs in with the `validLogin` fixture, then drives the cart
 * and all three checkout screens. Every stage is a `visualStep`, so the TTA
 * report shows one collapsible step per stage with its own screenshot
 * (requires ATTACH_SCREENSHOTS=true).
 *
 * The negative login path sits at the bottom, driven by the `invalidLogin`
 * fixture.
 */

import { test, expect } from '@fixtures/test-base';
import { DataGenerator } from '@utils/DataGenerator';
import { visualStep } from '@utils/visualSteps';

// First product card on the TTACart inventory page.
const FIRST_ITEM_ID = 'test-allthethings-tshirt-red';

test.describe('@P0 @Regression E2E @Checkout Checkout Feature', () => {

    test('should complete checkout successfully', async({
        validLogin,
        page,
        inventoryPage,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
        checkoutCompletePage,
    }) => {

        // Asking for `validLogin` is what signs us in.
        void validLogin;

        const customer = DataGenerator.checkoutCustomer();

        await visualStep(page, 'Inventory: open the products page', async () => {
            await inventoryPage.open();
        });

        await visualStep(page, 'Inventory: add the first item to the cart', async () => {
            await inventoryPage.addToCart(FIRST_ITEM_ID);
        });

        await visualStep(page, 'Cart: open the cart and verify one item', async () => {
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(1);
        });

        await visualStep(page, 'Cart: proceed to checkout step one', async () => {
            await cartPage.checkout();
            await checkoutStepOnePage.assertLoaded();
        });

        await visualStep(page, 'Checkout step one: enter customer details', async () => {
            await checkoutStepOnePage.fillGuest(customer);
            await checkoutStepOnePage.continue();
        });

        await visualStep(page, 'Checkout step two: review the order', async () => {
            await checkoutStepTwoPage.assertLoaded();
        });

        await visualStep(page, 'Checkout complete: place the order and confirm', async () => {
            await checkoutStepTwoPage.finish();
            await checkoutCompletePage.assertOrderComplete();
        });
    });
});

test.describe('@P1 @Regression Login Feature', () => {

    test('should reject the locked out user', async({ invalidLogin, page }) => {

        // `invalidLogin` has already signed in as locked_out_user and waited for
        // the error box, so this test only pins down the message.
        const { loginPage, username } = invalidLogin;

        await visualStep(page, `Login: ${username} is rejected`, async () => {
            await loginPage.expectedErrorContains('Epic sadface: Sorry, this user has been locked out.');
        });
    });
});
