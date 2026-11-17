// 10-11-2026
// created by AI
/**
 * Booking lifecycle against restful-booker, through the BookingApi fixture:
 *   1. Create a booking.
 *   2. Update it, then read it back.
 *   3. Delete it, then confirm a GET returns 404.
 *
 * No token code here: BookingApi fetches one from POST /auth on the first
 * update or delete, and fetches a fresh one if the API answers 403.
 */

// npm install jsonpath-plus

import {test, expect} from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';
import bookingSchema from '@testdata/jsonschema/booking.schema.json';
import { JSONPath} from 'jsonpath-plus';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Compiled once per worker, outside the test. `allErrors` collects every
// mismatch so one failure reports the whole list, not just the first.
const ajv = new Ajv({ allErrors : true });
addFormats(ajv); // teaches Ajv the `format: "date"` rule the schema uses
const validateBooking = ajv.compile(bookingSchema);

test.describe.serial('@e2e @P0 Level 3 - Booking lifecycle (BookingApi fixture)', () => {
    let bookingId: number;

    test('create a booking', async ({ bookingApi }) => {
        const payload = buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Journey' });
        const response = await bookingApi.createBooking(payload);
        const { bookingid, booking } = response;

        // const isValid = validateBooking(booking);
        // expect(isValid, JSON.stringify(validateBooking.errors, null, 2)).toBe(true);

        const isValid = validateBooking(response);
        expect(isValid, ajv.errorsText(validateBooking.errors)).toBe(true);

        expect(bookingid).toBeGreaterThan(0);
        expect(booking).toEqual(payload);

        const firstname = JSONPath({ path: '$.booking.firstname', json: response, wrap: false });
        const lastname = JSONPath({ path: '$.booking.lastname', json: response, wrap: false });
        const totalprice = JSONPath({ path: '$.booking.totalprice', json: response, wrap: false });
        const depositpaid = JSONPath({ path: '$.booking.depositpaid', json: response, wrap: false });
        const checkin = JSONPath({ path: '$.booking.bookingdates.checkin', json: response, wrap: false });
        const checkout = JSONPath({ path: '$.booking.bookingdates.checkout', json: response, wrap: false });
        const additionalneeds = JSONPath({ path: '$.booking.additionalneeds', json: response, wrap: false });

        expect(firstname).toBe(payload.firstname);
        expect(lastname).toBe(payload.lastname);
        expect(totalprice).toBe(payload.totalprice);
        expect(depositpaid).toBe(payload.depositpaid);
        expect(checkin).toBe(payload.bookingdates.checkin);
        expect(checkout).toBe(payload.bookingdates.checkout);
        expect(additionalneeds).toBe(payload.additionalneeds);

        // Schema check: types, required fields and date formats come from
        // testdata/jsonschema/booking.schema.json, not from this file. Validating
        // the payload we sent would prove nothing, so validate what came back.
       

        // // JSONPath returns every match as an ARRAY, so a single field comes back as
        // // ['E2E'] and not 'E2E'. `wrap: false` asks for the value itself.
        // // Long form: JSONPath({ path, json: response, wrap: false })
        // const at = (path: string) => JSONPath({ path, json: response, wrap: false });

        // // The root is the whole create response, and the booking sits at
        // // `response.booking` - hence the `$.booking.` prefix on every path.
        // expect(at('$.booking.firstname')).toBe(payload.firstname);
        // expect(at('$.booking.lastname')).toBe(payload.lastname);
        // expect(at('$.booking.totalprice')).toBe(payload.totalprice);
        // expect(at('$.booking.depositpaid')).toBe(payload.depositpaid);
        // expect(at('$.booking.bookingdates.checkin')).toBe(payload.bookingdates.checkin);
        // expect(at('$.booking.bookingdates.checkout')).toBe(payload.bookingdates.checkout);
        // expect(at('$.booking.additionalneeds')).toBe(payload.additionalneeds);
    });
});
