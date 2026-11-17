// 12-11-2026

import { test, expect } from '@playwright/test';

const URL = "https://app.thetestingacademy.com/playwright/tta-bank/";

test.describe('Check the TTA Bank wbesite' , () => {

    test.beforeEach('Check the URL ', async({ page}) => {
        await page.goto(URL);
    });

    test('Check the TTA Bank passbook transactions', async({ page}) => {
        await page.locator('#loginEmail').fill('priya.tester@ttabank.in');
        await page.getByTestId('login-password').fill('Test@1234');
        await page.locator('#loginSubmit').click();

        let balance = await page.getByTestId('balance-amount');
        await expect(balance).toHaveText('₹50,000');

        let amount = await page.locator('.tx-amt.credit');
        await expect(amount).toHaveText('+₹50,000');

        const sendmoney = await page.getByRole('link', {name : 'Send money'}).nth(1);
        await sendmoney.click();

        const person = await page.getByTestId('beneficiary-ben-102');
        await person.click();

        await page.pause();
    })

})