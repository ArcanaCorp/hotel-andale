import { getDatabase } from "../index";

export async function createRoom(data) {
    const db = await getDatabase();

    try {
        return await db.withExclusiveTransactionAsync(
            async tx => {
                const roomType = await tx.getFirstAsync(
                    `SELECT id FROM room_types
                     WHERE id = ? AND is_active = 1`,
                    [data.roomTypeId]
                );

                if (!roomType) {
                    throw new Error(
                        "El tipo de habitación no existe."
                    );
                }

                const result = await tx.runAsync(
                    `INSERT INTO rooms (
                        room_type_id,
                        number,
                        floor,
                        description,
                        photo_uri
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        data.roomTypeId,
                        data.number,
                        data.floor,
                        data.description || null,
                        data.photoUri || null,
                    ]
                );

                const roomId = result.lastInsertRowId;

                for (const key of data.amenities) {
                    await tx.runAsync(
                        `INSERT INTO room_amenities
                         (room_id, amenity_key)
                         VALUES (?, ?)`,
                        [roomId, key]
                    );
                }

                for (const rate of data.rates) {
                    await tx.runAsync(
                        `INSERT INTO room_rates
                         (room_id, billing_mode, price_cents)
                         VALUES (?, ?, ?)`,
                        [
                            roomId,
                            rate.billingMode,
                            rate.priceCents,
                        ]
                    );
                }

                return roomId;
            }
        );
    } catch (error) {
        const message = String(error?.message ?? "");

        if (message.includes("UNIQUE constraint failed") &&
            message.includes("rooms.number")) {
            throw new Error(
                "Ya existe una habitación con ese número."
            );
        }

        throw error;
    }
}

export async function getRooms() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT
            r.*,
            rt.name AS room_type,
            rt.capacity
        FROM rooms r
        INNER JOIN room_types rt
            ON rt.id = r.room_type_id
        WHERE r.is_active = 1
        ORDER BY r.number
    `);
}

// Obtener detalle de una habitación
export async function getRoomById(id) {
    const db = await getDatabase();

    return db.getFirstAsync(
        `
        SELECT
            r.*,
            rt.name AS room_type
        FROM rooms r
        LEFT JOIN room_types rt
            ON rt.id = r.room_type_id
        WHERE r.id = ?
        LIMIT 1
        `,
        [id]
    );
}

// Actualizar habitación
export async function updateRoom(id, data) {
    const db = await getDatabase();

    return db.withExclusiveTransactionAsync(async tx => {
        const room = await tx.getFirstAsync(
            "SELECT * FROM rooms WHERE id = ?",
            [id]
        );

        if (!room) {
            throw new Error("La habitación no existe.");
        }

        const duplicate = await tx.getFirstAsync(
            `
            SELECT id
            FROM rooms
            WHERE number = ?
              AND id <> ?
            LIMIT 1
            `,
            [data.number, id]
        );

        if (duplicate) {
            throw new Error(
                "Ya existe otra habitación con ese número."
            );
        }

        const activeStay = await tx.getFirstAsync(
            `
            SELECT id
            FROM stays
            WHERE room_id = ?
              AND status = 'ACTIVE'
            LIMIT 1
            `,
            [id]
        );

        if (activeStay) {
            if (
                data.operationalStatus !== "OCCUPIED" ||
                !data.isActive
            ) {
                throw new Error(
                    "No puedes cambiar el estado ni desactivar una habitación con estadía activa."
                );
            }
        }

        await tx.runAsync(
            `
            UPDATE rooms
            SET
                number = ?,
                room_type_id = ?,
                floor = ?,
                description = ?,
                photo_uri = ?,
                operational_status = ?,
                is_active = ?
            WHERE id = ?
            `,
            [
                data.number,
                data.roomTypeId,
                data.floor || null,
                data.description || null,
                data.photoUri || null,
                data.operationalStatus,
                data.isActive ? 1 : 0,
                id,
            ]
        );

        return true;
    });
}

// Comprobar si una habitación puede eliminarse
export async function canDeleteRoom(id) {
    const db = await getDatabase();

    const result = await db.getFirstAsync(
        `
        SELECT
            r.id,
            r.operational_status,

            (
                SELECT COUNT(*)
                FROM reservations b
                WHERE b.room_id = r.id
            ) AS reservations_count,

            (
                SELECT COUNT(*)
                FROM stays s
                WHERE s.room_id = r.id
            ) AS stays_count

        FROM rooms r
        WHERE r.id = ?
        LIMIT 1
        `,
        [id]
    );

    if (!result) {
        return {
            allowed: false,
            reason: "La habitación no existe.",
        };
    }

    if (result.operational_status !== "AVAILABLE") {
        return {
            allowed: false,
            reason:
                "La habitación debe estar disponible para eliminarla.",
        };
    }

    if (result.reservations_count > 0) {
        return {
            allowed: false,
            reason:
                "No puedes eliminar una habitación que tiene reservas registradas.",
        };
    }

    if (result.stays_count > 0) {
        return {
            allowed: false,
            reason:
                "No puedes eliminar una habitación que tiene historial de hospedaje.",
        };
    }

    return { allowed: true, reason: null };
}

// Eliminar habitación y datos propios asociados
export async function deleteRoom(id) {
    const db = await getDatabase();

    return db.withExclusiveTransactionAsync(async tx => {
        const room = await tx.getFirstAsync(
            `
            SELECT id, operational_status
            FROM rooms
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (!room) {
            throw new Error("La habitación no existe.");
        }

        if (room.operational_status !== "AVAILABLE") {
            throw new Error(
                "Solo puedes eliminar habitaciones disponibles."
            );
        }

        const reservation = await tx.getFirstAsync(
            `
            SELECT id
            FROM reservations
            WHERE room_id = ?
            LIMIT 1
            `,
            [id]
        );

        if (reservation) {
            throw new Error(
                "No puedes eliminar una habitación con reservas registradas."
            );
        }

        const stay = await tx.getFirstAsync(
            `
            SELECT id
            FROM stays
            WHERE room_id = ?
            LIMIT 1
            `,
            [id]
        );

        if (stay) {
            throw new Error(
                "No puedes eliminar una habitación con historial de hospedaje."
            );
        }

        // Eliminar exclusivamente datos propios
        // de esta habitación.
        await tx.runAsync(
            "DELETE FROM room_amenities WHERE room_id = ?",
            [id]
        );

        await tx.runAsync(
            "DELETE FROM room_rates WHERE room_id = ?",
            [id]
        );

        const result = await tx.runAsync(
            "DELETE FROM rooms WHERE id = ?",
            [id]
        );

        if (result.changes !== 1) {
            throw new Error(
                "No se pudo eliminar la habitación."
            );
        }

        return true;
    });
}