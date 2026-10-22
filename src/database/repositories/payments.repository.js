
import { getDatabase } from "../index";

const METHODS = [
    "CASH",
    "YAPE",
    "PLIN",
    "TRANSFER",
    "CARD",
];

/**
 * Cuentas pendientes: reservas con o sin estadía, más estadías directas.
 * La propiedad account_key evita colisiones entre identificadores de tablas.
 */
export async function listReceivableReservations() {
    const db = await getDatabase();
    return db.getAllAsync(`
        SELECT
            'RESERVATION' AS account_type,
            'R-' || r.id AS account_key,
            r.id, r.id AS reservation_id, NULL AS stay_id,
            r.booking_code, r.status, r.agreed_price_cents,
            g.first_name, g.last_name, rm.number AS room_number,
            r.agreed_price_cents + COALESCE((
                SELECT SUM(c.total_cents) FROM charges c
                JOIN stays s ON s.id = c.stay_id
                WHERE s.reservation_id = r.id
            ), 0) AS total_cents,
            COALESCE((
                SELECT SUM(CASE WHEN p.type = 'REFUND' THEN -p.amount_cents
                                ELSE p.amount_cents END)
                FROM payments p LEFT JOIN stays s ON s.id = p.stay_id
                WHERE p.reservation_id = r.id OR s.reservation_id = r.id
            ), 0) AS paid_cents
        FROM reservations r
        JOIN guests g ON g.id = r.guest_id
        JOIN rooms rm ON rm.id = r.room_id
        WHERE r.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
        UNION ALL
        SELECT
            'STAY' AS account_type,
            'S-' || s.id AS account_key,
            s.id, NULL AS reservation_id, s.id AS stay_id,
            'EST-' || printf('%06d', s.id) AS booking_code,
            s.status, s.agreed_price_cents,
            g.first_name, g.last_name, rm.number AS room_number,
            s.agreed_price_cents + COALESCE((
                SELECT SUM(c.total_cents) FROM charges c WHERE c.stay_id = s.id
            ), 0) AS total_cents,
            COALESCE((
                SELECT SUM(CASE WHEN p.type = 'REFUND' THEN -p.amount_cents
                                ELSE p.amount_cents END)
                FROM payments p WHERE p.stay_id = s.id
            ), 0) AS paid_cents
        FROM stays s
        JOIN guests g ON g.id = s.primary_guest_id
        JOIN rooms rm ON rm.id = s.room_id
        WHERE s.reservation_id IS NULL AND s.status = 'ACTIVE'
    `).then(rows => rows.filter(row => row.total_cents > row.paid_cents));
}

export async function listPayments() {
    const db = await getDatabase();
    return db.getAllAsync(`
        SELECT p.*, r.booking_code, g.first_name, g.last_name,
               rm.number AS room_number
        FROM payments p
        LEFT JOIN stays s ON s.id = p.stay_id
        LEFT JOIN reservations r ON r.id = COALESCE(p.reservation_id, s.reservation_id)
        LEFT JOIN guests g ON g.id = COALESCE(r.guest_id, s.primary_guest_id)
        LEFT JOIN rooms rm ON rm.id = COALESCE(r.room_id, s.room_id)
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

/**
 * Acepta exactamente una cuenta: reservationId o stayId.
 * Los cobros de una reserva ya convertida en estadía permanecen asociados
 * a la reserva y son visibles en ambos contextos.
 */
async function resolveAccount(tx, data) {
    const reservationId = data.reservationId == null ? null : Number(data.reservationId);
    const stayId = data.stayId == null ? null : Number(data.stayId);
    if ((reservationId !== null) === (stayId !== null)) {
        throw new Error("Selecciona una reserva o una estadía.");
    }
    const id = reservationId ?? stayId;
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Identificador de cuenta inválido.");
    }

    if (reservationId !== null) {
        const row = await tx.getFirstAsync(
            "SELECT id, booking_code, status, agreed_price_cents FROM reservations WHERE id = ?",
            [reservationId]
        );
        if (!row) throw new Error("La reserva no existe.");
        const charges = await tx.getFirstAsync(`
            SELECT COALESCE(SUM(c.total_cents), 0) AS total
            FROM charges c JOIN stays s ON s.id = c.stay_id
            WHERE s.reservation_id = ?
        `, [reservationId]);
        const payments = await tx.getFirstAsync(`
            SELECT COALESCE(SUM(CASE WHEN p.type = 'REFUND' THEN -p.amount_cents
                                     ELSE p.amount_cents END), 0) AS paid
            FROM payments p LEFT JOIN stays s ON s.id = p.stay_id
            WHERE p.reservation_id = ? OR s.reservation_id = ?
        `, [reservationId, reservationId]);
        return {
            reservationId, stayId: null, status: row.status,
            code: row.booking_code || `RSV-${String(reservationId).padStart(6, "0")}`,
            totalCents: Number(row.agreed_price_cents) + Number(charges?.total || 0),
            paidCents: Number(payments?.paid || 0),
        };
    }

    const stay = await tx.getFirstAsync(
        "SELECT id, reservation_id, status, agreed_price_cents FROM stays WHERE id = ?",
        [stayId]
    );
    if (!stay) throw new Error("La estadía no existe.");
    if (stay.reservation_id != null) {
        // No duplicar el saldo: usar la cuenta de reserva que incluye esta estadía.
        return resolveAccount(tx, { reservationId: stay.reservation_id });
    }
    const charges = await tx.getFirstAsync(
        "SELECT COALESCE(SUM(total_cents), 0) AS total FROM charges WHERE stay_id = ?",
        [stayId]
    );
    const payments = await tx.getFirstAsync(`
        SELECT COALESCE(SUM(CASE WHEN type = 'REFUND' THEN -amount_cents
                                 ELSE amount_cents END), 0) AS paid
        FROM payments WHERE stay_id = ?
    `, [stayId]);
    return {
        reservationId: null, stayId, status: stay.status,
        code: `EST-${String(stayId).padStart(6, "0")}`,
        totalCents: Number(stay.agreed_price_cents) + Number(charges?.total || 0),
        paidCents: Number(payments?.paid || 0),
    };
}

async function recordFinancialMovement(data, type) {
    const db = await getDatabase();
    const amountCents = Number(data.amountCents);
    const method = data.paymentMethod;
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        throw new Error("El monto debe ser mayor a cero.");
    }
    if (!METHODS.includes(method)) throw new Error("Método de pago inválido.");
    if (method !== "CASH" && !String(data.reference || "").trim()) {
        throw new Error("Ingresa la referencia de la operación.");
    }
    if (type === "REFUND" && !String(data.notes || "").trim()) {
        throw new Error("Indica el motivo de la devolución.");
    }

    let createdId = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const account = await resolveAccount(tx, data);
        if (type === "PAYMENT" &&
            !["PENDING", "CONFIRMED", "CHECKED_IN", "ACTIVE"].includes(account.status)) {
            throw new Error("La cuenta no admite nuevos cobros.");
        }
        if (type === "PAYMENT" && amountCents > account.totalCents - account.paidCents) {
            throw new Error("El cobro supera el saldo pendiente.");
        }
        if (type === "REFUND" && amountCents > account.paidCents) {
            throw new Error("La devolución supera el importe neto cobrado.");
        }
        const session = await tx.getFirstAsync(
            "SELECT id FROM cash_sessions WHERE status = 'OPEN' LIMIT 1"
        );
        if (!session) throw new Error("Debes abrir una caja antes de registrar movimientos.");

        const now = new Date().toISOString();
        const movement = await tx.runAsync(`
            INSERT INTO cash_movements
                (session_id, type, category, description, amount_cents, payment_method, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            session.id, type === "PAYMENT" ? "INCOME" : "EXPENSE",
            type === "PAYMENT" ? "Cobro de hospedaje" : "Devolución de hospedaje",
            `${account.reservationId != null ? "Reserva" : "Estadía"} ${account.code}`,
            amountCents, method, now,
        ]);
        const payment = await tx.runAsync(`
            INSERT INTO payments
                (reservation_id, stay_id, amount_cents, method, type, reference,
                 notes, cash_movement_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            account.reservationId, account.stayId, amountCents, method, type,
            String(data.reference || "").trim() || null,
            String(data.notes || "").trim() || null,
            movement.lastInsertRowId, now,
        ]);
        createdId = payment.lastInsertRowId;
    });
    return createdId;
}

export async function registerPayment(data) {
    return recordFinancialMovement(data, "PAYMENT");
}

export async function registerRefund(data) {
    return recordFinancialMovement(data, "REFUND");
}
