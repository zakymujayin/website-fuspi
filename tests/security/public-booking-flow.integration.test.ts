import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  bookingHttpStatus,
  cancelPublicBooking,
  executeBookingCommand,
  getPublicBooking,
  listBookings,
  submitBooking,
} from "@/features/booking/domain";
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
  let actorId = "";

  function applicationStorageKey(label: string) {
    return `2026/09/${createHash("sha256").update(`${marker}-${label}`).digest("hex")}.pdf`;
  }

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
      applicationStorageKey: applicationStorageKey(String(overrides.startTime ?? "default")),
      ...overrides,
    };
  }

  async function bookingByNumber(number: string) {
    const booking = await prisma.booking.findUnique({
      where: {bookingNumber: number},
      select: {id: true, version: true, status: true},
    });
    if (!booking) throw new Error(`missing booking ${number}`);
    return booking;
  }

  function actor(role: "ADMIN" | "PETUGAS" | "STAF_UMUM" | "DEKAN" | "WADEK" | "KABAG" = "PETUGAS") {
    return {
      userId: actorId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date(Date.now() + 3_600_000),
    };
  }

  async function advanceToAvailability(number: string) {
    let booking = await bookingByNumber(number);
    const verified = await executeBookingCommand(prisma, actor(), {
      action: "VERIFY_STAFF",
      bookingId: booking.id,
      expectedVersion: booking.version,
      reason: "Surat lengkap.",
    });
    expect(verified.ok).toBe(true);

    booking = await bookingByNumber(number);
    const disposed = await executeBookingCommand(prisma, actor(), {
      action: "DISPOSE",
      bookingId: booking.id,
      expectedVersion: booking.version,
      target: "KABAG",
      reason: "Mohon cek ruangan.",
    });
    expect(disposed.ok).toBe(true);
    return bookingByNumber(number);
  }

  beforeAll(async () => {
    await prisma.$connect();
    actorId = (await prisma.user.create({
      data: {
        name: `${marker} Petugas`,
        email: `${marker}-petugas@example.test`,
        role: "PETUGAS",
        isActive: true,
      },
    })).id;
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
    await prisma.activityLog.deleteMany({where: {actorId}});
    await prisma.room.deleteMany({where: {id: {in: [roomId, smallRoomId]}}});
    await prisma.user.deleteMany({where: {id: actorId}});
    await prisma.$disconnect();
  });

  it("issues a booking number and a canonical tracking token with submitted status", async () => {
    expect(bookingNumber).toMatch(/^FUSPI-B-\d{4}-\d{4,}$/u);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    const found = await getPublicBooking(prisma, {bookingNumber, token});
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.status).toBe("DIAJUKAN");
  });

  it("allows overlapping pending requests for administrative review", async () => {
    const result = await submitBooking(prisma, request({...slot("10:00", "12:00")}));
    expect(result.ok).toBe(true);
    if (result.ok) bookingNumbers.push(result.bookingNumber);
  });

  it("refuses public submission that overlaps an approved booking", async () => {
    const approved = await submitBooking(prisma, request({...slot("10:00", "11:00")}));
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    bookingNumbers.push(approved.bookingNumber);

    const booking = await advanceToAvailability(approved.bookingNumber);
    const approvedCommand = await executeBookingCommand(prisma, actor(), {
      action: "APPROVE",
      bookingId: booking.id,
      expectedVersion: booking.version,
    });
    expect(approvedCommand.ok).toBe(true);

    const result = await submitBooking(prisma, request({...slot("10:15", "10:45")}));
    expect(result).toMatchObject({ok: false, code: "TIME_OVERLAP"});
  });

  it("accepts a slot that clears the approved booking buffer", async () => {
    const result = await submitBooking(prisma, request({...slot("11:45", "12:45")}));
    expect(result.ok).toBe(true);
    if (result.ok) bookingNumbers.push(result.bookingNumber);
  });

  it("rechecks conflicts when the final approval is made", async () => {
    const first = await submitBooking(prisma, request({...slot("14:00", "15:00")}));
    const second = await submitBooking(prisma, request({...slot("14:10", "14:50"), requesterEmail: `${marker}-second@example.test`}));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    bookingNumbers.push(first.bookingNumber, second.bookingNumber);

    let booking = await advanceToAvailability(first.bookingNumber);
    const approved = await executeBookingCommand(prisma, actor(), {
      action: "APPROVE",
      bookingId: booking.id,
      expectedVersion: booking.version,
    });
    expect(approved.ok).toBe(true);

    booking = await advanceToAvailability(second.bookingNumber);
    const rejectedBySchedule = await executeBookingCommand(prisma, actor(), {
      action: "APPROVE",
      bookingId: booking.id,
      expectedVersion: booking.version,
    });
    expect(rejectedBySchedule).toMatchObject({ok: false, code: "TIME_OVERLAP"});
  });

  it("enforces institutional role boundaries across the disposition workflow", async () => {
    const submitted = await submitBooking(prisma, request({
      ...slot("15:30", "16:00"),
      requesterEmail: `${marker}-rbac@example.test`,
    }));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    bookingNumbers.push(submitted.bookingNumber);

    let booking = await bookingByNumber(submitted.bookingNumber);
    const dekanCannotVerify = await executeBookingCommand(prisma, actor("DEKAN"), {
      action: "VERIFY_STAFF",
      bookingId: booking.id,
      expectedVersion: booking.version,
      reason: "Melompati staf umum.",
    });
    expect(dekanCannotVerify).toMatchObject({ok: false, code: "SESSION_INVALID"});

    const verified = await executeBookingCommand(prisma, actor("STAF_UMUM"), {
      action: "VERIFY_STAFF",
      bookingId: booking.id,
      expectedVersion: booking.version,
      reason: "Surat permohonan lengkap.",
    });
    expect(verified.ok).toBe(true);

    booking = await bookingByNumber(submitted.bookingNumber);
    expect(booking.status).toBe("DISPOSISI_DEKAN");
    const staffCannotDispose = await executeBookingCommand(prisma, actor("STAF_UMUM"), {
      action: "DISPOSE",
      bookingId: booking.id,
      expectedVersion: booking.version,
      target: "WADEK_I",
      reason: "Bukan kewenangan staf.",
    });
    expect(staffCannotDispose).toMatchObject({ok: false, code: "SESSION_INVALID"});

    const disposed = await executeBookingCommand(prisma, actor("DEKAN"), {
      action: "DISPOSE",
      bookingId: booking.id,
      expectedVersion: booking.version,
      target: "WADEK_I",
      reason: "Mohon tindak lanjut ketersediaan ruangan.",
    });
    expect(disposed.ok).toBe(true);

    booking = await bookingByNumber(submitted.bookingNumber);
    expect(booking.status).toBe("CEK_KETERSEDIAAN");
    for (const role of ["STAF_UMUM", "DEKAN"] as const) {
      const denied = await executeBookingCommand(prisma, actor(role), {
        action: "APPROVE",
        bookingId: booking.id,
        expectedVersion: booking.version,
      });
      expect(denied).toMatchObject({ok: false, code: "SESSION_INVALID"});
    }

    const approved = await executeBookingCommand(prisma, actor("WADEK"), {
      action: "APPROVE",
      bookingId: booking.id,
      expectedVersion: booking.version,
    });
    expect(approved.ok).toBe(true);
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

  it("lets PETUGAS list booking requests without room-admin privileges", async () => {
    const listed = await listBookings(prisma, {
      userId: "synthetic-petugas",
      role: "PETUGAS",
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date(Date.now() + 3_600_000),
    }, {});
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data.items.some((item) => item.bookingNumber === bookingNumber)).toBe(true);
    }

    const denied = await listBookings(prisma, {
      userId: "synthetic-dosen",
      role: "DOSEN",
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date(Date.now() + 3_600_000),
    }, {});
    expect(denied).toEqual({ok: false, code: "SESSION_INVALID"});
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

  it("lets the requester cancel a waiting booking with the tracking token", async () => {
    const submitted = await submitBooking(prisma, request({...slot("16:30", "16:45")}));
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    bookingNumbers.push(submitted.bookingNumber);

    const cancelled = await cancelPublicBooking(prisma, {
      bookingNumber: submitted.bookingNumber,
      token: submitted.trackingToken,
      reason: "Agenda pemohon dibatalkan.",
    });
    expect(cancelled).toEqual({ok: true, bookingNumber: submitted.bookingNumber});

    const tracked = await getPublicBooking(prisma, {
      bookingNumber: submitted.bookingNumber,
      token: submitted.trackingToken,
    });
    expect(tracked.ok).toBe(true);
    if (tracked.ok) {
      expect(tracked.status).toBe("DIBATALKAN");
      expect(tracked.cancelReason).toBe("Agenda pemohon dibatalkan.");
    }
  });
});
