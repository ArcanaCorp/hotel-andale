
import { getDatabase } from "../index";

const MODES = ["HOURLY", "NIGHTLY"];

export async function listRoomRates() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT
            r.id,
            r.number,
            r.floor,
            r.is_active,
            r.operational_status,
            rt.name AS room_type_name,

            h.id AS hourly_rate_id,
            h.price_cents AS hourly_price_cents,
            h.is_active AS hourly_active,

            n.id AS nightly_rate_id,
            n.price_cents AS nightly_price_cents,
            n.is_active AS nightly_active

        FROM rooms r

        INNER JOIN room_types rt
            ON rt.id = r.room_type_id

        LEFT JOIN room_rates h
            ON h.room_id = r.id
            AND h.billing_mode = 'HOURLY'

        LEFT JOIN room_rates n
            ON n.room_id = r.id
            AND n.billing_mode = 'NIGHTLY'

        ORDER BY
            CAST(r.number AS INTEGER),
            r.number
    `);
}

export async function getRoomRates(roomId) {
    const db = await getDatabase();

    return db.getAllAsync(
        `
        SELECT *
        FROM room_rates
        WHERE room_id = ?
        ORDER BY billing_mode
        `,
        [roomId]
    );
}

export async function saveRoomRates(roomId, rates) {
    const db = await getDatabase();

    const id = Number(roomId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Habitación inválida.");
    }

    if (!Array.isArray(rates) || !rates.length) {
        throw new Error("No hay tarifas para guardar.");
    }

    const seen = new Set();

    for (const rate of rates) {
        if (!MODES.includes(rate.billing_mode)) {
            throw new Error(
                "Modalidad de tarifa inválida."
            );
        }

        if (seen.has(rate.billing_mode)) {
            throw new Error(
                "No puedes repetir una modalidad."
            );
        }

        seen.add(rate.billing_mode);

        if (
            !Number.isSafeInteger(rate.price_cents) ||
            rate.price_cents < 0
        ) {
            throw new Error(
                "El precio debe ser un importe válido."
            );
        }

        if (![0, 1].includes(rate.is_active)) {
            throw new Error(
                "El estado de la tarifa no es válido."
            );
        }
    }

    await db.withExclusiveTransactionAsync(async tx => {
        const room = await tx.getFirstAsync(
            "SELECT id FROM rooms WHERE id = ?",
            [id]
        );

        if (!room) {
            throw new Error(
                "La habitación no existe."
            );
        }

        for (const rate of rates) {
            await tx.runAsync(
                `
                INSERT INTO room_rates (
                    room_id,
                    billing_mode,
                    price_cents,
                    is_active
                )
                VALUES (?, ?, ?, ?)

                ON CONFLICT(room_id, billing_mode)
                DO UPDATE SET
                    price_cents = excluded.price_cents,
                    is_active = excluded.is_active
                `,
                [
                    id,
                    rate.billing_mode,
                    rate.price_cents,
                    rate.is_active,
                ]
            );
        }
    });

    return getRoomRates(id);
}
