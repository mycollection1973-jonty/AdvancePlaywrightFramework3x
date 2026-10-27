// 27-10-2026
// created by AI for validLogin
/**
 * End-to-end checkout flow:
 *   1. Log in as a standard user (standard_user / tta_secret).
 *   2. Navigate to the inventory page.
 *   3. Add the first item to the cart.
 *   4. Navigate to the cart page.
 *   5. From the cart, proceed through checkout step one and checkout step two.
 *   6. Enter the customer details and complete the order.
 *
 * Every stage below is wrapped in `visualStep`, so the TTA report gets one
 * collapsible step per stage with a screenshot pinned to it
 * (needs ATTACH_SCREENSHOTS=true).
 */

// DataGenerated
// Fixture. - loginPage


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

        // Asking for `validLogin` is what logs us in — the fixture opens the
        // login page, signs in and waits for the login button to disappear, so
        // the test body starts already authenticated on the inventory page.
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

        // The `invalidLogin` fixture already signed in as locked_out_user from
        // logintestdata.json and waited for the error box, so the test body
        // only has to pin down the message itself.
        const { loginPage, username } = invalidLogin;

        await visualStep(page, `Login: ${username} is rejected`, async () => {
            await loginPage.expectedErrorContains('Epic sadface: Sorry, this user has been locked out.');
        });
    });
});
