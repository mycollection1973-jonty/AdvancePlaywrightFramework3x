// 5-11-2026

import { test, expect } from '@playwright/test';
import { logger } from '@utils/logger';

test('TC#1 @p0 - POST : Verify that create booking is working fine', async({ request }) => {

    //HTTP -> POST
    // URL -> https://restful-booker.herokuapp.com/booking
    // PAYLOAD / request body /. Body / data -> json file or js object
    // headers  - content-type json
    // auth ? NO

    const payload = {
        firstname: "Jim",
        lastname : "Brown",
        totalprice: 111,
        depositpaid : true,
        bookingdates : {
        checkin : "2018-01-01",
        checkout : "2019-01-01"
        },
       additionalneeds : "Breakfast"
    }
    logger.info(`Payload is set : ${JSON.stringify(payload)}`);

    const headers = {
        'Accept' : 'application/json',
        'Content-Type' : 'application/json',
    }
    logger.info(`Header is set: ${JSON.stringify(headers)}`);

    const responseData = await request.post('/booking', {
        headers,
        data : payload,
    })
    logger.info(`Response is set: ${JSON.stringify(await responseData.json())}`);

    expect(responseData.status()).toBe(200);
    const data = await responseData.json();
    expect(data.bookingid).toBeTruthy();
    expect(data.booking.firstname).toBe(payload.firstname);
    expect(data.booking.lastname).toBe(payload.lastname);
    expect(data.booking.bookingdates.checkin).toBe(payload.bookingdates.checkin);
    logger.info(`Created booking id: ${data.bookingid}`);
})



//$env:BASE_URL='https://restful-booker.herokuapp.com'
//npx playwright test "src/tests/apiTests/01_restfulbooker_raw/01_02_post_operation.spec.ts" --reporter="line,./src/utils/CustomReporter.ts"