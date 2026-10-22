import test from "node:test";
import assert from "node:assert/strict";
import { canCheckIn, canCheckOut, canMarkRoomClean } from "../src/services/stay-lifecycle.rules.mjs";

test("check-in: reserva pendiente y habitación disponible", () => {
    assert.equal(canCheckIn({ reservationStatus: "PENDING", roomStatus: "AVAILABLE", roomActive: true, existingStay: false }), true);
    assert.equal(canCheckIn({ reservationStatus: "CONFIRMED", roomStatus: "AVAILABLE", roomActive: true, existingStay: false }), true);
});
test("check-in: evita duplicado, reserva cancelada, mantenimiento y limpieza", () => {
    const base = { reservationStatus: "PENDING", roomStatus: "AVAILABLE", roomActive: true, existingStay: false };
    for (const override of [
        { existingStay: true }, { reservationStatus: "CHECKED_IN" },
        { reservationStatus: "CANCELLED" }, { roomStatus: "OCCUPIED" },
        { roomStatus: "CLEANING" }, { roomStatus: "MAINTENANCE" }, { roomActive: false },
    ]) assert.equal(canCheckIn({ ...base, ...override }), false);
});
test("check-out: solo estadía activa, ocupada y sin deuda", () => {
    const base = { stayStatus: "ACTIVE", roomStatus: "OCCUPIED", balanceCents: 0 };
    assert.equal(canCheckOut(base), true);
    assert.equal(canCheckOut({ ...base, balanceCents: -100 }), true);
    for (const override of [
        { balanceCents: 1 }, { balanceCents: NaN }, { stayStatus: "COMPLETED" },
        { stayStatus: "CANCELLED" }, { roomStatus: "AVAILABLE" },
        { roomStatus: "CLEANING" },
    ]) assert.equal(canCheckOut({ ...base, ...override }), false);
});
test("limpieza: solo habitación activa en CLEANING y sin estadía activa", () => {
    const base = { roomStatus: "CLEANING", roomActive: true, activeStay: false };
    assert.equal(canMarkRoomClean(base), true);
    for (const override of [
        { roomStatus: "AVAILABLE" }, { roomStatus: "OCCUPIED" },
        { roomStatus: "MAINTENANCE" }, { roomActive: false }, { activeStay: true },
    ]) assert.equal(canMarkRoomClean({ ...base, ...override }), false);
});
