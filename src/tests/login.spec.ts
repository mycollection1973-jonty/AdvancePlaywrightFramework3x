// 15-10-2026

import { test, expect} from '@playwright/test';
import { LoginPage} from '../pages/LoginPage';

test.describe('POM with Login page simple', () => {
    test('Login with valid creds', async({ page }) => {

        //  This is without the POM
        // await page.goto('https://app.thetestingacademy.com/playwright/ttacart/');
        // await page.getByRole('textbox', { name : 'Username'}).fill;
        // //...

        // This is with POM
        const loginPage = new LoginPage(page);
        await loginPage.open();
        await loginPage.loginAs("standard_user", "tta_secret");
        await expect(page).toHaveTitle("TTACart - Products");
    })
})
