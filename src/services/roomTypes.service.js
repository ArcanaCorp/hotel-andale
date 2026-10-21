import { createRoomType, getActiveRoomTypes } from "../database/repositories/roomTypes.repository";
import { createRoomTypeCategory, updateRoomTypeCategory, deactivateRoomTypeCategory } from "../database/repositories/roomTypes.repository";
import { ROOM_AMENITIES } from "../constants/amenities";

export async function listRoomTypes() {
    return getActiveRoomTypes();
}

function toCents(value) {
    const text = String(value ?? "").trim();

    if (!text) return null;

    if (!/^\d+([.,]\d{1,2})?$/.test(text)) {
        throw new Error("Ingresa un precio válido.");
    }

    const cents = Math.round(
        Number(text.replace(",", ".")) * 100
    );

    if (!Number.isSafeInteger(cents)) {
        throw new Error("El precio es demasiado grande.");
    }

    return cents;
}

export async function registerRoomType(data) {
    const name = String(data.name ?? "").trim();
    const capacity = Number(data.capacity);

    if (!name) {
        throw new Error("Ingresa el nombre del tipo.");
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
        throw new Error("Ingresa una capacidad válida.");
    }

    const allowedAmenities = new Set(
        ROOM_AMENITIES.map(item => item.key)
    );

    const amenities = [
        ...new Set(data.amenities ?? []),
    ].filter(key => allowedAmenities.has(key));

    const hourlyPriceCents = toCents(data.hourlyPrice);
    const nightlyPriceCents = toCents(data.nightlyPrice);

    if (
        hourlyPriceCents === null &&
        nightlyPriceCents === null
    ) {
        throw new Error("Configura al menos una tarifa.");
    }

    return createRoomType({
        name,
        description: String(data.description ?? "").trim(),
        capacity,
        photoUri: data.photoUri ?? null,
        amenities,
        hourlyPriceCents,
        nightlyPriceCents,
    });
}



function validateCategory(data) {
    const name = String(data.name ?? "").trim();
    const description = String(data.description ?? "").trim();
    const capacity = Number(data.capacity);

    if (!name) {
        throw new Error("Ingresa el nombre de la categoría.");
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
        throw new Error("Ingresa una capacidad válida.");
    }

    return { name, description, capacity };
}

function handleCategoryError(error) {
    if (
        String(error?.message ?? "").includes(
            "UNIQUE constraint failed: room_types.name"
        )
    ) {
        throw new Error(
            "Ya existe una categoría con ese nombre."
        );
    }

    throw error;
}

export async function registerRoomTypeCategory(data) {
    try {
        return await createRoomTypeCategory(
            validateCategory(data)
        );
    } catch (error) {
        handleCategoryError(error);
    }
}

export async function editRoomTypeCategory(id, data) {
    try {
        const changes = await updateRoomTypeCategory(
            id,
            validateCategory(data)
        );

        if (!changes) {
            throw new Error("Categoría no encontrada.");
        }

        return changes;
    } catch (error) {
        handleCategoryError(error);
    }
}

export async function deleteRoomTypeCategory(id) {
    const changes = await deactivateRoomTypeCategory(id);

    if (!changes) {
        throw new Error("Categoría no encontrada.");
    }

    return changes;
}
