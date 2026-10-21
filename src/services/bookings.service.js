import { getDatabase } from "../database";

export async function listBookings() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT
            res.id,
            res.room_id,
            res.guest_id,
            res.billing_mode,
            res.start_at,
            res.end_at,
            res.status,
            res.agreed_price_cents,
            res.notes,
            res.created_at,

            room.number AS room_number,
            rt.name AS room_type,

            guest.first_name,
            guest.last_name,
            guest.document_type,
            guest.document_number,

            COALESCE((
                SELECT SUM(
                    CASE
                        WHEN p.type = 'REFUND'
                            THEN -p.amount_cents
                        ELSE p.amount_cents
                    END
                )
                FROM payments p
                WHERE p.reservation_id = res.id
            ), 0) AS paid_cents

        FROM reservations res

        INNER JOIN rooms room
            ON room.id = res.room_id

        INNER JOIN room_types rt
            ON rt.id = room.room_type_id

        INNER JOIN guests guest
            ON guest.id = res.guest_id

        ORDER BY res.start_at DESC, res.id DESC
    `);
}