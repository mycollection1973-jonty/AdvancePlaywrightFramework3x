// 7-11-2026

/**
 * Lean review copy of `03-01_booking-crud-e2e.spec.ts` — same coverage, same
 * fixtures, deliberately tighter. Kept as its own file so the two can be run and
 * compared side by side in the report.
 *
 * The booking lifecycle: create -> update -> read back -> delete -> confirm gone.
 * Auth is not visible anywhere below on purpose: the `bookingApi` fixture mints
 * and caches the token, and re-auths once by itself if a call comes back 403.
 */

import { test, expect } from '@fixtures/booker.fixture';
import { buildBookingFromGenerator } from '@testdata/booking.data';

// The first test produces the id the next two need, so the chain has to stay in
// one worker. `.serial` is what guarantees that: drop it and the three tests can
// be split across workers, each with its own empty `bookingId`.
test.describe.serial('@e2e @P0 Level 3 - Booking Lifecycle (lean review)', () => {
    let bookingId: number;

    test('create a booking', async ({ bookingApi }) => {
        const { bookingid, booking } = await bookingApi.createBooking(
            buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Journey' }),
        );

        expect(bookingid).toBeGreaterThan(0);
        expect(booking.firstname).toBe('E2E'); // the server echoes the payload back
        bookingId = bookingid;
    });

    test('update the booking, then read it back', async ({ bookingApi }) => {
        const updated = await bookingApi.updateBooking(
            bookingId,
            buildBookingFromGenerator({ firstname: 'E2E', lastname: 'Updated', totalprice: 950 }),
        );
        expect(updated).toMatchObject({ lastname: 'Updated', totalprice: 950 });

        // PUT replaces the whole booking, so a fresh GET proves the change was
        // persisted rather than just echoed in the update response.
        expect((await bookingApi.getBooking(bookingId)).lastname).toBe('Updated');
    });

    test('delete the booking and confirm it is gone', async ({ bookingApi }) => {
        expect(await bookingApi.deleteBooking(bookingId)).toBe(201); // 201 here, not the usual 204

        // getBooking() throws on a non-2xx, so the raw response is the only way
        // to read the 404 back.
        expect((await bookingApi.getBookingResponse(bookingId)).status()).toBe(404);
    });
});
