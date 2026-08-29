import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {bookingHttpStatus, getPublicBooking, submitBooking} from "@/features/booking/domain";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

/* A fixed Wednesday inside the seeded Monday-to-Friday window, expressed in
   Jakarta time so the assertion does not drift with the machine clock. */
const DAY = "2026-09-02";
const slot = (from: string, to: string) => ({
  startTime: `${DAY}T${from}:00+07:00`,
  endTime: `${DAY}T${to}:00+07:00`,
});

suite("public booking flow on PostgreSQL", () => {
  const prisma = createPrismaClient();
  const marker = `booking-flow-${Date.now()}`;
  const bookingNumbers: string[] = [];
  let roomId = "";
  let smallRoomId = "";
  let bookingNumber = "";
  let token = "";

  function request(overrides: Record<string, unknown> = {}) {
    return {
      roomId,
      requesterName: `${marker} Panitia`,
      requesterEmail: `${marker}@example.test`,
      requesterPhone: null,
      organization: null,
      purpose: "Seminar metodologi tafsir.",
      participantCount: 20,
      ...slot("09:00", "11:00"),
      ...overrides,
    };
  }

  beforeAll(async () => {
    await prisma.$connect();
    const room = await prisma.room.create({
      data: {
        slug: `${marker}-besar`,
        capacity: 100,
        bufferMinutes: 30,
        translations: {create: [{locale: "id", name: `${marker} Aula`, location: "Lt. 1", status: "PUBLISHED"}]},
        operatingHours: {create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({dayOfWeek, opensAtMinute: 480, closesAtMinute: 1020}))},
      },
    });
    const small = await prisma.room.create({
      data: {
        slug: `${marker}-kecil`,
        capacity: 10,
        bufferMinutes: 0,
        translations: {create: [{locale: "id", name: `${marker} Diskusi`, status: "PUBLISHED"}]},
        operatingHours: {create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({dayOfWeek, opensAtMinute: 480, closesAtMinute: 1020}))},
      },
    });
    roomId = room.id;
    smallRoomId = small.id;

    const result = await submitBooking(prisma, request());
    if (!result.ok) throw new Error(`submit failed: ${result.code}`);
    bookingNumber = result.bookingNumber;
    token = result.trackingToken;
    bookingNumbers.push(bookingNumber);
  });

  afterAll(async () => {
    const ids = (await prisma.booking.findMany({where: {roomId: {in: [roomId, smallRoomId]}}, select: {id: true}}))
      .map(({id}) => id);
    if (ids.length) {
      await prisma.bookingHistory.deleteMany({where: {bookingId: {in: ids}}});
      await prisma.booking.deleteMany({where: {id: {in: ids}}});
    }
    await prisma.room.deleteMany({where: {id: {in: [roomId, smallRoomId]}}});
    await prisma.$disconnect();
  });

  it("issues a booking number and a canonical tracking token, waiting for review", () => {
    expect(bookingNumber).toMatch(/^FUSPI-B-\d{4}-\d{4,}$/u);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  });

  it("refuses a request that overlaps an existing one", async () => {
    const result = await submitBooking(prisma, request({...slot("10:00", "12:00")}));
    expect(result).toMatchObject({ok: false, code: "TIME_OVERLAP"});
  });

  /* The room carries a 30 minute turnaround, so a request starting immediately
     after the first one ends still collides. */
  it("honours the turnaround buffer between two bookings", async () => {
    const result = await submitBooking(prisma, request({...slot("11:00", "12:00")}));
    expect(result).toMatchObject({ok: false, code: "TIME_OVERLAP"});
  });

  it("accepts a slot that clears the buffer", async () => {
    const result = await submitBooking(prisma, request({...slot("11:45", "12:45")}));
    expect(result.ok).toBe(true);
    if (result.ok) bookingNumbers.push(result.bookingNumber);
  });

  it("refuses a group larger than the room", async () => {
    const result = await submitBooking(prisma, request({roomId: smallRoomId, participantCount: 500, ...slot("14:00", "15:00")}));
    expect(result).toMatchObject({ok: false, code: "CAPACITY_EXCEEDED"});
  });

  it("refuses a slot outside the operating hours", async () => {
    const result = await submitBooking(prisma, request({...slot("06:00", "07:00")}));
    expect(result).toMatchObject({ok: false, code: "OPERATING_HOURS"});
  });

  it("refuses an end time that precedes the start", async () => {
    const result = await submitBooking(prisma, request({...slot("11:00", "09:00")}));
    expect(result).toMatchObject({ok: false, code: "REQUEST_INVALID"});
  });

  it("returns the booking only for the matching token", async () => {
    const found = await getPublicBooking(prisma, {bookingNumber, token});
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.purpose).toBe("Seminar metodologi tafsir.");
  });

  /* Regression: `createTrackingTokenDigest` parses with `.parse`, so a
     well-formed but non-canonical base64url token threw and surfaced as
     UNAVAILABLE, answering 503 for what is simply a wrong code. */
  it("answers NOT_FOUND, never UNAVAILABLE, for a wrong but well-formed token", async () => {
    for (const wrong of ["x".repeat(43), "-".repeat(43), "_".repeat(43)]) {
      const result = await getPublicBooking(prisma, {bookingNumber, token: wrong});
      expect(result).toEqual({ok: false, code: "NOT_FOUND"});
      expect(bookingHttpStatus(result)).toBe(404);
    }
  });

  it("refuses an unknown booking number without revealing the difference", async () => {
    const result = await getPublicBooking(prisma, {bookingNumber: "FUSPI-B-2099-9999", token});
    expect(result).toEqual({ok: false, code: "NOT_FOUND"});
  });
});
