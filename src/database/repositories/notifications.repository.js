
import { getDatabase } from "../index";

export async function getNotificationSettings() {
    const db = await getDatabase();

    return db.getFirstAsync(`
        SELECT *
        FROM notification_settings
        WHERE id = 1
    `);
}

export async function updateNotificationSettings(data) {
    const db = await getDatabase();

    const allowed = [
        "enabled",
        "checkout_alerts",
        "reservation_alerts",
        "room_alerts",
        "cash_alerts",
        "license_alerts",
    ];

    const entries = Object.entries(data).filter(
        ([key]) => allowed.includes(key)
    );

    if (!entries.length) return getNotificationSettings();

    const fields = entries
        .map(([key]) => `${key} = ?`)
        .join(", ");

    await db.runAsync(
        `UPDATE notification_settings
         SET ${fields}, updated_at = ?
         WHERE id = 1`,
        [
            ...entries.map(([, value]) => value ? 1 : 0),
            new Date().toISOString(),
        ]
    );

    return getNotificationSettings();
}

export async function listLocalNotifications() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT *
        FROM local_notifications
        ORDER BY
            CASE WHEN read_at IS NULL THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT 100
    `);
}

export async function getUnreadNotificationCount() {
    const db = await getDatabase();

    const row = await db.getFirstAsync(`
        SELECT COUNT(*) AS total
        FROM local_notifications
        WHERE read_at IS NULL
    `);

    return row?.total ?? 0;
}

export async function createLocalNotification(data) {
    const db = await getDatabase();

    await db.runAsync(
        `
        INSERT OR IGNORE INTO local_notifications (
            event_key,
            category,
            title,
            body,
            route,
            entity_id,
            scheduled_at,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            data.eventKey,
            data.category,
            data.title,
            data.body,
            data.route || null,
            data.entityId || null,
            data.scheduledAt || null,
            new Date().toISOString(),
        ]
    );

    return db.getFirstAsync(
        `SELECT *
         FROM local_notifications
         WHERE event_key = ?`,
        [data.eventKey]
    );
}

export async function setNotificationSchedule(
    id,
    expoId
) {
    const db = await getDatabase();

    await db.runAsync(
        `UPDATE local_notifications
         SET expo_notification_id = ?
         WHERE id = ?`,
        [expoId, id]
    );
}

export async function markNotificationRead(id) {
    const db = await getDatabase();

    await db.runAsync(
        `UPDATE local_notifications
         SET read_at = COALESCE(read_at, ?)
         WHERE id = ?`,
        [new Date().toISOString(), id]
    );
}

export async function markAllNotificationsRead() {
    const db = await getDatabase();

    await db.runAsync(
        `UPDATE local_notifications
         SET read_at = COALESCE(read_at, ?)
         WHERE read_at IS NULL`,
        [new Date().toISOString()]
    );
}
