import { getDatabase } from "../database";

export async function getDashboardSummary() {
    const db = await getDatabase();

    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");

    // Límites del día según hora local del dispositivo.
    const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    ).toISOString();

    const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    ).toISOString();

    const [
        roomCounts,
        income,
        departures,
        arrivals,
        pendingCleaning,
    ] = await Promise.all([
        db.getFirstAsync(`
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(
                    CASE WHEN operational_status = 'AVAILABLE'
                    THEN 1 ELSE 0 END
                ), 0) AS available,
                COALESCE(SUM(
                    CASE WHEN operational_status = 'OCCUPIED'
                    THEN 1 ELSE 0 END
                ), 0) AS occupied,
                COALESCE(SUM(
                    CASE WHEN operational_status = 'CLEANING'
                    THEN 1 ELSE 0 END
                ), 0) AS cleaning,
                COALESCE(SUM(
                    CASE WHEN operational_status = 'MAINTENANCE'
                    THEN 1 ELSE 0 END
                ), 0) AS maintenance
            FROM rooms
            WHERE is_active = 1
        `),

        db.getFirstAsync(`
            SELECT
                COALESCE(SUM(
                    CASE
                        WHEN type = 'REFUND' THEN -amount_cents
                        ELSE amount_cents
                    END
                ), 0) AS total_cents
            FROM payments
            WHERE created_at >= ?
              AND created_at < ?
        `, [startOfDay, endOfDay]),

        db.getAllAsync(`
            SELECT
                s.id,
                s.room_id,
                r.number AS room_number,
                g.first_name,
                g.last_name,
                s.scheduled_check_out_at,
                s.billing_mode
            FROM stays s
            INNER JOIN rooms r ON r.id = s.room_id
            INNER JOIN guests g ON g.id = s.primary_guest_id
            WHERE s.status = 'ACTIVE'
              AND s.scheduled_check_out_at < ?
            ORDER BY s.scheduled_check_out_at ASC
            LIMIT 10
        `, [endOfDay]),
,
        db.getFirstAsync(`
            SELECT COUNT(*) AS total
            FROM reservations
            WHERE status IN ('PENDING', 'CONFIRMED')
              AND start_at >= ?
              AND start_at < ?
        `, [startOfDay, endOfDay]),

        db.getFirstAsync(`
            SELECT COUNT(*) AS total
            FROM rooms
            WHERE is_active = 1
              AND operational_status = 'CLEANING'
        `),    ]);

    return {
        date: today,
        rooms: {
            total: roomCounts?.total ?? 0,
            available: roomCounts?.available ?? 0,
            occupied: roomCounts?.occupied ?? 0,
            cleaning: roomCounts?.cleaning ?? 0,
            maintenance: roomCounts?.maintenance ?? 0,
        },
        incomeCents: income?.total_cents ?? 0,
        arrivalsToday: arrivals?.total ?? 0,
        pendingCleaning: pendingCleaning?.total ?? 0,
        departures,
    };
}