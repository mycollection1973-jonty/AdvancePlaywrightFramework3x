// 6-11-2026

import {test, expect} from '@playwright/test';
import { logger } from '@utils/logger';

test.describe('Restful Booker booking API - negative', () => {

    // PUT negative paths. The happy path lives in 01_04_put_operation.spec.ts.
    // Create Auth    -> Post Auth    -> token
    // Create Booking -> Post Booking -> bookingid
    // Negative PUT   -> PUT /booking/:id with no token, a bad token,
    //                   and a booking id that does not exist

    test('TC#3 @p1 - PUT : Verify that an unauthorised or unknown update is rejected', async ({ request }) => {

        const headers = {
            'Accept' : 'application/json',
            'Content-Type' : 'application/json',
        }

        const payload = {
            firstname: 'Pramod',
            lastname: 'Dutta',
            totalprice: 111,
            depositpaid: true,
            bookingdates: {
                checkin: '2018-01-01',
                checkout: '2019-01-01',
            },
            additionalneeds: 'Breakfast',
        };

        let token = '';
        let bookingId = 0;

        await test.step('Step 1 - Create Auth token', async() => {

            const responseData = await request.post('/auth', {
                headers,
                data : {
                    username : 'admin',
                    password : 'password123',
                },
            })
            expect(responseData.status()).toBe(200);

            const data = await responseData.json();
            token = data.token;
            expect(token).toBeTruthy();
            logger.info('Create auth token for the negative PUT checks');
        })

        await test.step('Step 2 - Create booking for the negative checks', async() => {

            const responseData = await request.post('/booking', {
                headers,
                data : payload,
            });
            expect(responseData.status()).toBe(200);

            const data = await responseData.json();
            bookingId = data.bookingid;
            expect(bookingId).toBeTruthy();
            logger.info(`Created booking id for the negative checks: ${bookingId}`);
        })

        await test.step('Step 3 - PUT with no token is rejected', async() => {

            const responseData = await request.put(`/booking/${bookingId}`, {
                headers,
                data : payload,
            });

            expect(responseData.status()).toBe(403);
            expect(await responseData.text()).toBe('Forbidden');
            logger.info(`PUT with no token rejected: ${responseData.status()} ${await responseData.text()}`);
        })

        await test.step('Step 4 - PUT with an invalid token is rejected', async() => {

            const responseData = await request.put(`/booking/${bookingId}`, {
                headers : {
                    ...headers,
                    Cookie : 'token=thisIsNotARealToken',
                },
                data : payload,
            });

            expect(responseData.status()).toBe(403);
            expect(await responseData.text()).toBe('Forbidden');
            logger.info(`PUT with a bad token rejected: ${responseData.status()} ${await responseData.text()}`);
        })

        await test.step('Step 5 - PUT against a booking id that does not exist is rejected', async() => {

            // Observed behaviour of the demo API: an unknown id answers 405,
            // not the 404 you would normally expect.
            const responseData = await request.put('/booking/999999999', {
                headers : {
                    ...headers,
                    Cookie : `token=${token}`,
                },
                data : payload,
            });

            expect(responseData.status()).toBe(405);
            expect(await responseData.text()).toBe('Method Not Allowed');
            logger.info(`PUT on an unknown booking id rejected: ${responseData.status()} ${await responseData.text()}`);
        })
    })
})
