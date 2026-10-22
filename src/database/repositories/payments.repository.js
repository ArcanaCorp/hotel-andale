
import { getDatabase } from "../index";

const METHODS = [
    "CASH",
    "YAPE",
    "PLIN",
    "TRANSFER",
    "CARD",
];

export async function listReceivableReservations() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT
            r.id, r.booking_code, r.status, r.agreed_price_cents,
            g.first_name, g.last_name, rm.number AS room_number,
            COALESCE((
                SELECT SUM(CASE WHEN p.type = 'REFUND'
                    THEN -p.amount_cents ELSE p.amount_cents END)
                FROM payments p
                LEFT JOIN stays s ON s.id = p.stay_id
                WHERE p.reservation_id = r.id OR s.reservation_id = r.id
            ), 0) AS paid_cents,
            r.agreed_price_cents + COALESCE((
                SELECT SUM(c.total_cents)
                FROM charges c JOIN stays s ON s.id = c.stay_id
                WHERE s.reservation_id = r.id
            ), 0) AS total_cents
        FROM reservations r
        JOIN guests g ON g.id = r.guest_id
        JOIN rooms rm ON rm.id = r.room_id
        WHERE r.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
          AND (
              r.agreed_price_cents + COALESCE((
                  SELECT SUM(c.total_cents)
                  FROM charges c JOIN stays s ON s.id = c.stay_id
                  WHERE s.reservation_id = r.id
              ), 0)
              - COALESCE((
                  SELECT SUM(CASE WHEN p.type = 'REFUND'
                      THEN -p.amount_cents ELSE p.amount_cents END)
                  FROM payments p
                  LEFT JOIN stays s ON s.id = p.stay_id
                  WHERE p.reservation_id = r.id OR s.reservation_id = r.id
              ), 0)
          ) > 0
        ORDER BY r.start_at DESC
    `);
}

export async function listPayments() {
    const db = await getDatabase();
    return db.getAllAsync(`
        SELECT p.*, r.booking_code, g.first_name, g.last_name,
               rm.number AS room_number
        FROM payments p
        LEFT JOIN stays s ON s.id = p.stay_id
        JOIN reservations r ON r.id = COALESCE(p.reservation_id, s.reservation_id)
        JOIN guests g ON g.id = r.guest_id
        JOIN rooms rm ON rm.id = r.room_id
        ORDER BY p.created_at DESC, p.id DESC
    `);
}

export async function getPaymentsSummary() {
    const db = await getDatabase();

    return db.getFirstAsync(`
        SELECT
            COALESCE(SUM(
                CASE
                    WHEN type = 'PAYMENT' THEN amount_cents
                    WHEN type = 'REFUND' THEN -amount_cents
                    ELSE 0
                END
            ), 0) AS total_cents,

            COALESCE(SUM(
                CASE
                    WHEN method = 'CASH'
                    THEN CASE
                        WHEN type = 'REFUND' THEN -amount_cents
                        ELSE amount_cents
                    END
                    ELSE 0
                END
            ), 0) AS cash_cents,

            COALESCE(SUM(
                CASE
                    WHEN method <> 'CASH'
                    THEN CASE
                        WHEN type = 'REFUND' THEN -amount_cents
                        ELSE amount_cents
                    END
                    ELSE 0
                END
            ), 0) AS digital_cents,

            COUNT(*) AS payments_count

        FROM payments
    `);
}

export async function registerPayment(data) {
    const db = await getDatabase();

    let createdPaymentId = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const reservationId = Number(
            data.reservationId
        );

        const amountCents = Number(
            data.amountCents
        );

        if (
            !Number.isSafeInteger(reservationId) ||
            reservationId <= 0
        ) {
            throw new Error(
                "Selecciona una reserva válida."
            );
        }

        if (
            !Number.isSafeInteger(amountCents) ||
            amountCents <= 0
        ) {
            throw new Error(
                "El monto debe ser mayor a cero."
            );
        }

        if (!METHODS.includes(data.paymentMethod)) {
            throw new Error(
                "Método de pago inválido."
            );
        }

        const reservation = await tx.getFirstAsync(
            `
            SELECT
                id,
                booking_code,
                status,
                agreed_price_cents
            FROM reservations
            WHERE id = ?
            `,
            [reservationId]
        );

        if (!reservation) {
            throw new Error(
                "La reserva no existe."
            );
        }

        if (![
            "PENDING",
            "CONFIRMED",
            "CHECKED_IN",
        ].includes(reservation.status)) {
            throw new Error(
                "No puedes registrar cobros en esta reserva."
            );
        }

        const paid = await tx.getFirstAsync(`
            SELECT COALESCE(SUM(
                CASE WHEN p.type = 'REFUND' THEN -p.amount_cents
                ELSE p.amount_cents END
            ), 0) AS total
            FROM payments p
            LEFT JOIN stays s ON s.id = p.stay_id
            WHERE p.reservation_id = ? OR s.reservation_id = ?
        `, [reservationId, reservationId]);

        const charges = await tx.getFirstAsync(`
            SELECT COALESCE(SUM(c.total_cents), 0) AS total
            FROM charges c JOIN stays s ON s.id = c.stay_id
            WHERE s.reservation_id = ?
        `, [reservationId]);

        const remaining =
            reservation.agreed_price_cents +
            Number(charges?.total || 0) -
            Number(paid?.total || 0);

        if (amountCents > remaining) {
            throw new Error(
                "El cobro supera el saldo pendiente."
            );
        }

        const session = await tx.getFirstAsync(`
            SELECT id
            FROM cash_sessions
            WHERE status = 'OPEN'
            LIMIT 1
        `);

        if (!session) {
            throw new Error(
                "Debes abrir una caja antes de registrar cobros."
            );
        }

        const timestamp =
            new Date().toISOString();

        const movement = await tx.runAsync(
            `
            INSERT INTO cash_movements (
                session_id,
                type,
                category,
                description,
                amount_cents,
                payment_method,
                created_at
            )
            VALUES (
                ?, 'INCOME', ?, ?, ?, ?, ?
            )
            `,
            [
                session.id,
                "Cobro de hospedaje",
                `Reserva ${reservation.booking_code}`,
                amountCents,
                data.paymentMethod,
                timestamp,
            ]
        );

        const result = await tx.runAsync(
            `
            INSERT INTO payments (
                reservation_id,
                amount_cents,
                method,
                type,
                reference,
                notes,
                cash_movement_id,
                created_at
            )
            VALUES (?, ?, ?, 'PAYMENT', ?, ?, ?, ?)
            `,
            [
                reservationId,
                amountCents,
                data.paymentMethod,
                data.reference?.trim() || null,
                data.notes?.trim() || null,
                movement.lastInsertRowId,
                timestamp,
            ]
        );

        createdPaymentId = result.lastInsertRowId;
    });

    return createdPaymentId;
}
