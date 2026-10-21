import { getFloors, createFloor } from "../database/repositories/floors.repository";

export async function listFloors() {
    return getFloors();
}

export async function registerFloor(value) {
    const text = String(value ?? "").trim();

    if (!/^\d+$/.test(text)) {
        throw new Error("Ingresa un número de piso válido.");
    }

    const number = Number(text);

    if (!Number.isSafeInteger(number) || number > 999) {
        throw new Error("El piso debe estar entre 0 y 999.");
    }

    return createFloor(number);
}