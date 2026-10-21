import { createRoom, getRooms, getRoomById } from "../database/repositories/rooms.repository";

export async function registerRoom(data) {
    if (!data.number?.trim()) {
        throw new Error("El número de habitación es obligatorio");
    }

    if (!Number.isInteger(data.roomTypeId) ||
        data.roomTypeId <= 0) {
        throw new Error("Selecciona un tipo de habitación válido");
    }

    return createRoom({
        roomTypeId: data.roomTypeId,
        number: data.number.trim(),
        floor: data.floor
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
