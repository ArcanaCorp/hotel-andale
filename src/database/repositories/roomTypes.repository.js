import { getDatabase } from "../index";

export async function getActiveRoomTypes() {
    const db = await getDatabase();

    const types = await db.getAllAsync(`
        SELECT
            rt.*,
            (
                SELECT rp.price_cents
                FROM rate_plans rp
                WHERE rp.room_type_id = rt.id
                  AND rp.billing_mode = 'HOURLY'
                  AND rp.is_active = 1
                ORDER BY rp.id DESC
                LIMIT 1
            ) AS hourly_price_cents,
            (
                SELECT rp.price_cents
                FROM rate_plans rp
                WHERE rp.room_type_id = rt.id
                  AND rp.billing_mode = 'NIGHTLY'
                  AND rp.is_active = 1
                ORDER BY rp.id DESC
                LIMIT 1
            ) AS nightly_price_cents
        FROM room_types rt
        WHERE rt.is_active = 1
        ORDER BY rt.name COLLATE NOCASE
    `);

    const amenities = await db.getAllAsync(`
        SELECT room_type_id, amenity_key
        FROM room_type_amenities
    `);

    return types.map(type => ({
        ...type,
        amenities: amenities
            .filter(a => a.room_type_id === type.id)
            .map(a => a.amenity_key),
    }));
}

export async function createRoomType(data) {
    const db = await getDatabase();

    return db.withExclusiveTransactionAsync(async tx => {
        const result = await tx.runAsync(
            `INSERT INTO room_types (
                name,
                description,
                capacity,
                photo_uri
            ) VALUES (?, ?, ?, ?)`,
            [
                data.name,
                data.description || null,
                data.capacity,
                data.photoUri || null,
            ]
        );

        const id = result.lastInsertRowId;

        for (const amenity of data.amenities) {
            await tx.runAsync(
                `INSERT INTO room_type_amenities (
                    room_type_id, amenity_key
                ) VALUES (?, ?)`,
                [id, amenity]
            );
        }

        if (data.hourlyPriceCents !== null) {
            await tx.runAsync(
                `INSERT INTO rate_plans (
                    room_type_id,
                    name,
                    billing_mode,
                    duration_hours,
                    price_cents
                ) VALUES (?, ?, 'HOURLY', ?, ?)`,
                [
                    id,
                    "Tarifa por hora",
                    1,
                    data.hourlyPriceCents,
                ]
            );
        }

        if (data.nightlyPriceCents !== null) {
            await tx.runAsync(
                `INSERT INTO rate_plans (
                    room_type_id,
                    name,
                    billing_mode,
                    duration_hours,
                    price_cents
                ) VALUES (?, ?, 'NIGHTLY', NULL, ?)`,
                [
                    id,
                    "Tarifa por noche",
                    data.nightlyPriceCents,
                ]
            );
        }

        return id;
    });
}

export async function createRoomTypeCategory(data) {
    const db = await getDatabase();

    const result = await db.runAsync(
        `INSERT INTO room_types (
            name,
            description,
            capacity
        ) VALUES (?, ?, ?)`,
        [
            data.name,
            data.description || null,
            data.capacity,
        ]
    );

    return result.lastInsertRowId;
}

export async function updateRoomTypeCategory(id, data) {
    const db = await getDatabase();

    const result = await db.runAsync(
        `UPDATE room_types
         SET name = ?,
             description = ?,
             capacity = ?
         WHERE id = ? AND is_active = 1`,
        [
            data.name,
            data.description || null,
            data.capacity,
            id,
        ]
    );

    return result.changes;
}

export async function deactivateRoomTypeCategory(id) {
    const db = await getDatabase();

    const result = await db.runAsync(
        `UPDATE room_types
         SET is_active = 0
         WHERE id = ? AND is_active = 1`,
        [id]
    );

    return result.changes;
}
