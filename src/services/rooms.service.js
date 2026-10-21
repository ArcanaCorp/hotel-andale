import { createRoom, getRooms, getRoomById } from "../database/repositories/rooms.repository";
import { getActiveRoomTypes } from "../database/repositories/roomTypes.repository";


import { ROOM_AMENITIES } from "../constants/amenities";

// Mantén las importaciones existentes de tus repositorios.

function priceToCents(value) {
    const text = String(value ?? "").trim();

    if (!text) return null;

    if (!/^\d+([.,]\d{1,2})?$/.test(text)) {
        throw new Error("Ingresa un precio válido.");
    }

    const cents = Math.round(
        Number(text.replace(",", ".")) * 100
    );

    if (!Number.isSafeInteger(cents) || cents <= 0) {
        throw new Error("La tarifa debe ser mayor a cero.");
    }

    return cents;
}

export async function registerRoom(data) {
    const number = String(data.number ?? "").trim();
    const roomTypeId = Number(data.roomTypeId);
    const floor = Number(data.floor);

    if (!number) {
        throw new Error("Ingresa el número de habitación.");
    }

    if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
        throw new Error("Selecciona un tipo de habitación.");
    }

    if (!Number.isInteger(floor) || floor < 0) {
        throw new Error("Selecciona un piso válido.");
    }

    const hourly = priceToCents(data.hourlyPrice);
    const nightly = priceToCents(data.nightlyPrice);

    if (hourly === null && nightly === null) {
        throw new Error("Ingresa al menos una tarifa.");
    }

    const rates = [];

    if (hourly !== null) {
        rates.push({
            billingMode: "HOURLY",
            priceCents: hourly,
        });
    }

    if (nightly !== null) {
        rates.push({
            billingMode: "NIGHTLY",
            priceCents: nightly,
        });
    }

    const allowed = new Set(
        ROOM_AMENITIES.map(item => item.key)
    );

    const amenities = [
        ...new Set(data.amenities ?? []),
    ].filter(key => allowed.has(key));

    return createRoom({
        number,
        roomTypeId,
        floor: String(floor),
        description: String(data.description ?? "").trim(),
        photoUri: data.photoUri ?? null,
        amenities,
        rates,
    });
}

export async function listRooms() {
    return getRooms();
}

export async function findRoom(id) {
    const room = await getRoomById(id);

    if (!room) {
        throw new Error("Habitación no encontrada");
    }

    return room;
}

export async function listRoomTypes() {
    return getActiveRoomTypes();
}