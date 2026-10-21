import { getDatabase } from "../index";

export async function createRoom(data) {
    const db = await getDatabase();

    const result = await db.runAsync(
        `INSERT INTO rooms (room_type_id, number, floor)
        VALUES (?, ?, ?)`,
        [data.roomTypeId, data.number, data.floor ?? null]
    );

    return result.lastInsertRowId;
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

export async function getRoomById(id) {
    const db = await getDatabase();

    return db.getFirstAsync(
        "SELECT * FROM rooms WHERE id = ?",
        [id]
    );
}