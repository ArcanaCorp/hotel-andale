import { getDatabase } from "../index";

export async function getFloors() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT id, number
        FROM hotel_floors
        WHERE is_active = 1
        ORDER BY number ASC
    `);
}

export async function createFloor(number) {
    const db = await getDatabase();

    // Reactiva un piso previamente desactivado.
    const existing = await db.getFirstAsync(
        "SELECT id, is_active FROM hotel_floors WHERE number = ?",
        [number]
    );

    if (existing) {
        if (!existing.is_active) {
            await db.runAsync(
                "UPDATE hotel_floors SET is_active = 1 WHERE id = ?",
                [existing.id]
            );
        }
        return existing.id;
    }

    const result = await db.runAsync(
        "INSERT INTO hotel_floors (number) VALUES (?)",
        [number]
    );

    return result.lastInsertRowId;
}