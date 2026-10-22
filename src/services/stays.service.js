import { canCheckIn, canCheckOut, canMarkRoomClean } from "./stay-lifecycle.rules.mjs";

import { getDatabase } from "../database";

const QR_PREFIX = "ANDALE-HOTEL:RESERVATION:";
const RESERVATION_READY = ["PENDING", "CONFIRMED"];

function positiveId(value, label = "Identificador") {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error(`${label} inválido.`);
    }

    return id;
}

function money(cents) {
    return `S/ ${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).replace("T", " ");
    }

    return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizeReservation(row) {
    if (!row) return null;

    return {
        id: row.id,
        code: row.booking_code || `RSV-${String(row.id).padStart(6, "0")}`,
        status: row.status,
        guestName: `${row.first_name} ${row.last_name}`.trim(),
        roomId: row.room_id,
        roomNumber: row.room_number,
        roomStatus: row.operational_status,
        checkInDate: formatDate(row.start_at),
        checkOutDate: formatDate(row.end_at),
        rateLabel: money(row.agreed_price_cents),
        priceCents: row.agreed_price_cents,
        startAt: row.start_at,
        endAt: row.end_at,
        billingMode: row.billing_mode,
    };
}

const RESERVATION_DETAILS_SQL = `
    SELECT
        b.*,
        r.number AS room_number,
        r.operational_status,
        r.is_active AS room_is_active,
        g.first_name,
        g.last_name
    FROM reservations b
    JOIN rooms r ON r.id = b.room_id
    JOIN guests g ON g.id = b.guest_id
    WHERE b.id = ?
    LIMIT 1
`;

async function getReservation(tx, reservationId) {
    return tx.getFirstAsync(
        RESERVATION_DETAILS_SQL,
        [reservationId]
    );
}

async function getPaymentBalance(tx, stay) {
    const payments = await tx.getFirstAsync(
        `
        SELECT COALESCE(
            SUM(
                CASE
                    WHEN type = 'REFUND'
                        THEN -amount_cents
                    ELSE amount_cents
                END
            ),
            0
        ) AS paid_cents
        FROM payments
        WHERE stay_id = ?
           OR (
               reservation_id = ?
               AND ? IS NOT NULL
           )
        `,
        [
            stay.id,
            stay.reservation_id,
            stay.reservation_id,
        ]
    );

    const charges = await tx.getFirstAsync(
        `
        SELECT COALESCE(
            SUM(total_cents), 0
        ) AS charges_cents
        FROM charges
        WHERE stay_id = ?
        `,
        [stay.id]
    );

    const totalCents =
        Number(stay.agreed_price_cents) +
        Number(charges?.charges_cents || 0);

    const paidCents =
        Number(payments?.paid_cents || 0);

    return {
        totalCents,
        paidCents,
        balanceCents: totalCents - paidCents,
    };
}

// Reservas para selección manual.
export async function getPendingCheckInReservations() {
    const db = await getDatabase();

    const rows = await db.getAllAsync(
        `
        SELECT
            b.id,
            b.booking_code,
            b.status,
            b.start_at,
            b.end_at,
            b.agreed_price_cents,
            b.room_id,
            b.billing_mode,
            r.number AS room_number,
            r.operational_status,
            g.first_name,
            g.last_name
        FROM reservations b
        JOIN rooms r ON r.id = b.room_id
        JOIN guests g ON g.id = b.guest_id
        WHERE b.status IN ('PENDING', 'CONFIRMED')
          AND r.is_active = 1
          AND r.operational_status = 'AVAILABLE'
          AND NOT EXISTS (
              SELECT 1
              FROM stays s
              WHERE s.reservation_id = b.id
          )
        ORDER BY b.start_at ASC, b.id ASC
        `
    );

    return rows.map(normalizeReservation);
}

// Interpretar el QR generado por el proyecto.
export async function resolveReservationQR(qrValue) {
    const raw = String(qrValue ?? "").trim();

    if (!raw.startsWith(QR_PREFIX)) {
        throw new Error(
            "Este código QR no pertenece a una reserva de Hotel Ándale."
        );
    }

    const token = raw.slice(QR_PREFIX.length).trim();

    if (!token) {
        throw new Error("El QR no contiene un identificador válido.");
    }

    const db = await getDatabase();

    const reservation = await db.getFirstAsync(
        `
        SELECT
            id,
            booking_code,
            status
        FROM reservations
        WHERE qr_token = ?
        LIMIT 1
        `,
        [token]
    );

    if (!reservation) {
        throw new Error(
            "No se encontró la reserva correspondiente al QR."
        );
    }

    if (["CANCELLED", "NO_SHOW"].includes(reservation.status)) {
        throw new Error(
            "Esta reserva está cancelada o marcada como no presentada."
        );
    }

    const stay = await db.getFirstAsync(
        `
        SELECT id, status
        FROM stays
        WHERE reservation_id = ?
        LIMIT 1
        `,
        [reservation.id]
    );

    return {
        id: reservation.id,
        code: reservation.booking_code,
        status: reservation.status,
        stayId: stay?.id ?? null,
        stayStatus: stay?.status ?? null,
        nextAction:
            stay?.status === "ACTIVE"
                ? "CHECK_OUT"
                : stay?.status === "COMPLETED"
                    ? "COMPLETED"
                    : RESERVATION_READY.includes(reservation.status)
                        ? "CHECK_IN"
                        : "UNAVAILABLE",
    };
}

// Detalle previo a confirmar check-in.
export async function getCheckInDetails(reservationId) {
    const id = positiveId(reservationId, "Reserva");
    const db = await getDatabase();

    const reservation = await getReservation(db, id);

    if (!reservation) {
        throw new Error("La reserva no existe.");
    }

    if (!RESERVATION_READY.includes(reservation.status)) {
        throw new Error(
            "Esta reserva ya no permite realizar check-in."
        );
    }

    if (
        reservation.room_is_active !== 1 ||
        reservation.operational_status !== "AVAILABLE"
    ) {
        throw new Error(
            "La habitación no está disponible para recibir al huésped."
        );
    }

    const stay = await db.getFirstAsync(
        "SELECT id FROM stays WHERE reservation_id = ?",
        [id]
    );

    if (stay) {
        throw new Error(
            "Esta reserva ya tiene una estadía registrada."
        );
    }

    return normalizeReservation(reservation);
}

// Confirmar ingreso y ocupar la habitación.
export async function confirmCheckIn(
    reservationId,
    { notes = "" } = {}
) {
    const id = positiveId(reservationId, "Reserva");
    const db = await getDatabase();

    let transactionResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const reservation = await getReservation(tx, id);

        if (!reservation) {
            throw new Error("La reserva no existe.");
        }

        if (!RESERVATION_READY.includes(reservation.status)) {
            throw new Error(
                "La reserva ya fue utilizada o no admite check-in."
            );
        }

        if (!canCheckIn({
            reservationStatus: reservation.status,
            roomStatus: reservation.operational_status,
            roomActive: reservation.room_is_active === 1,
            existingStay: false,
        })) {
            throw new Error(
                "La habitación no está disponible."
            );
        }

        const existing = await tx.getFirstAsync(
            `
            SELECT id
            FROM stays
            WHERE reservation_id = ?
               OR (
                   room_id = ?
                   AND status = 'ACTIVE'
               )
            LIMIT 1
            `,
            [id, reservation.room_id]
        );

        if (existing) {
            throw new Error(
                "Ya existe una estadía vinculada a esta reserva o habitación."
            );
        }

        // Evitar que otra reserva simultánea
        // esté programada para la misma habitación.
        const otherBooking = await tx.getFirstAsync(
            `
            SELECT id
            FROM reservations
            WHERE room_id = ?
              AND id <> ?
              AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
              AND start_at < ?
              AND end_at > ?
            LIMIT 1
            `,
            [
                reservation.room_id,
                id,
                reservation.end_at,
                reservation.start_at,
            ]
        );

        if (otherBooking) {
            throw new Error(
                "Existe otra reserva que se cruza con este horario."
            );
        }

        const now = new Date().toISOString();

        // Conservar el horario previsto de salida.
        // Si ya venció, requiere ajustar la reserva.
        if (
            new Date(reservation.end_at).getTime() <=
            Date.now()
        ) {
            throw new Error(
                "La salida prevista ya venció. Actualiza primero las fechas de la reserva."
            );
        }

        const inserted = await tx.runAsync(
            `
            INSERT INTO stays (
                reservation_id,
                room_id,
                primary_guest_id,
                billing_mode,
                check_in_at,
                scheduled_check_out_at,
                status,
                agreed_price_cents
            )
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
            `,
            [
                id,
                reservation.room_id,
                reservation.guest_id,
                reservation.billing_mode,
                now,
                reservation.end_at,
                reservation.agreed_price_cents,
            ]
        );

        const stayId = inserted.lastInsertRowId;

        await tx.runAsync(
            `
            INSERT INTO stay_guests (
                stay_id,
                guest_id
            )
            VALUES (?, ?)
            `,
            [stayId, reservation.guest_id]
        );

        const roomUpdate = await tx.runAsync(
            `
            UPDATE rooms
            SET operational_status = 'OCCUPIED'
            WHERE id = ?
              AND operational_status = 'AVAILABLE'
              AND is_active = 1
            `,
            [reservation.room_id]
        );

        if (roomUpdate.changes !== 1) {
            throw new Error(
                "No se pudo ocupar la habitación."
            );
        }

        const reservationUpdate = await tx.runAsync(
            `
            UPDATE reservations
            SET status = 'CHECKED_IN'
            WHERE id = ?
              AND status IN ('PENDING', 'CONFIRMED')
            `,
            [id]
        );

        if (reservationUpdate.changes !== 1) {
            throw new Error(
                "No se pudo actualizar el estado de la reserva."
            );
        }

        // La columna stays no tiene notes.
        // Guardamos las observaciones como auditoría.
        await tx.runAsync(
            `
            INSERT INTO audit_logs (
                entity_type,
                entity_id,
                action,
                old_values,
                new_values,
                created_at
            )
            VALUES (
                'STAY', ?, 'CHECK_IN',
                NULL, ?, ?
            )
            `,
            [
                stayId,
                JSON.stringify({
                    reservationId: id,
                    roomId: reservation.room_id,
                    notes: String(notes || "").trim(),
                }),
                now,
            ]
        );

        transactionResult = {
            stayId,
            reservationId: id,
            roomId: reservation.room_id,
            roomStatus: "OCCUPIED",
        };
    });
    return transactionResult;
}

// Obtener datos de cierre de una estadía.
export async function getCheckOutDetails(stayId) {
    const id = positiveId(stayId, "Estadía");
    const db = await getDatabase();

    const stay = await db.getFirstAsync(
        `
        SELECT
            s.*,
            r.number AS room_number,
            r.operational_status,
            g.first_name,
            g.last_name,
            b.booking_code
        FROM stays s
        JOIN rooms r ON r.id = s.room_id
        JOIN guests g ON g.id = s.primary_guest_id
        LEFT JOIN reservations b ON b.id = s.reservation_id
        WHERE s.id = ?
        LIMIT 1
        `,
        [id]
    );

    if (!stay) {
        throw new Error("La estadía no existe.");
    }

    if (stay.status !== "ACTIVE") {
        throw new Error("Esta estadía ya está cerrada.");
    }

    const balance = await getPaymentBalance(db, stay);

    return {
        id: stay.id,
        reservationId: stay.reservation_id,
        code: stay.booking_code,
        guestName:
            `${stay.first_name} ${stay.last_name}`.trim(),
        roomId: stay.room_id,
        roomNumber: stay.room_number,
        checkInDate: formatDate(stay.check_in_at),
        checkOutDate: formatDate(stay.scheduled_check_out_at),
        total: balance.totalCents / 100,
        paid: balance.paidCents / 100,
        balance: balance.balanceCents / 100,
        ...balance,
    };
}

// Cerrar estadía y enviar habitación a limpieza.
export async function confirmCheckOut(stayId) {
    const id = positiveId(stayId, "Estadía");
    const db = await getDatabase();

    let transactionResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const stay = await tx.getFirstAsync(
            `
            SELECT *
            FROM stays
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (!stay || stay.status !== "ACTIVE") {
            throw new Error(
                "La estadía no existe o ya fue finalizada."
            );
        }

        const balance = await getPaymentBalance(tx, stay);

        if (balance.balanceCents > 0) {
            throw new Error(
                `Hay un saldo pendiente de ${money(balance.balanceCents)}. Registra el pago antes del check-out.`
            );
        }

        const room = await tx.getFirstAsync(
            `
            SELECT operational_status
            FROM rooms
            WHERE id = ?
            `,
            [stay.room_id]
        );

        if (!canCheckOut({
            stayStatus: stay.status,
            roomStatus: room?.operational_status,
            balanceCents: balance.balanceCents,
        })) {
            throw new Error(
                "La habitación no se encuentra en estado Ocupada."
            );
        }

        const now = new Date().toISOString();

        const stayUpdate = await tx.runAsync(
            `
            UPDATE stays
            SET status = 'COMPLETED',
                actual_check_out_at = ?
            WHERE id = ?
              AND status = 'ACTIVE'
            `,
            [now, id]
        );

        if (stayUpdate.changes !== 1) {
            throw new Error(
                "No se pudo finalizar la estadía."
            );
        }

        const roomUpdate = await tx.runAsync(
            `
            UPDATE rooms
            SET operational_status = 'CLEANING'
            WHERE id = ?
              AND operational_status = 'OCCUPIED'
            `,
            [stay.room_id]
        );

        if (roomUpdate.changes !== 1) {
            throw new Error(
                "No se pudo enviar la habitación a limpieza."
            );
        }

        await tx.runAsync(
            `
            INSERT INTO audit_logs (
                entity_type,
                entity_id,
                action,
                old_values,
                new_values,
                created_at
            )
            VALUES (
                'STAY', ?, 'CHECK_OUT',
                NULL, ?, ?
            )
            `,
            [
                id,
                JSON.stringify({
                    roomId: stay.room_id,
                    status: "COMPLETED",
                    roomStatus: "CLEANING",
                }),
                now,
            ]
        );

        transactionResult = {
            stayId: id,
            roomId: stay.room_id,
            roomStatus: "CLEANING",
        };
    });
    return transactionResult;
}

// Confirmar limpieza y habilitar la habitación.
export async function markRoomClean(roomId) {
    const id = positiveId(roomId, "Habitación");
    const db = await getDatabase();

    let transactionResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
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
            throw new Error(
                "La habitación todavía tiene una estadía activa."
            );
        }

        const room = await tx.getFirstAsync(
            "SELECT operational_status, is_active FROM rooms WHERE id = ?",
            [id]
        );
        if (!canMarkRoomClean({
            roomStatus: room?.operational_status,
            roomActive: room?.is_active === 1,
            activeStay: Boolean(activeStay),
        })) {
            throw new Error("La habitación no está habilitada para finalizar limpieza.");
        }

        const updated = await tx.runAsync(
            `
            UPDATE rooms
            SET operational_status = 'AVAILABLE'
            WHERE id = ?
              AND is_active = 1
              AND operational_status = 'CLEANING'
            `,
            [id]
        );

        if (updated.changes !== 1) {
            throw new Error(
                "La habitación no está en limpieza o no está habilitada."
            );
        }

        transactionResult = {
            roomId: id,
            roomStatus: "AVAILABLE",
        };
    });
    return transactionResult;
}

// Función auxiliar para navegar directamente
// desde una reserva con estadía activa.
export async function getActiveStayByReservation(reservationId) {
    const id = positiveId(reservationId, "Reserva");
    const db = await getDatabase();

    return db.getFirstAsync(
        `
        SELECT *
        FROM stays
        WHERE reservation_id = ?
          AND status = 'ACTIVE'
        LIMIT 1
        `,
        [id]
    );
}
