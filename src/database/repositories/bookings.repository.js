import * as Crypto from "expo-crypto";
import { getDatabase } from "../index";


function localTimestamp(date = new Date()) {
    const pad = n => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Disponibilidad para el intervalo solicitado, no solo el estado actual.
 * Mantenimiento bloquea siempre. Una estadía vencida aún activa bloquea
 * hasta que se registre el check-out.
 */
function availabilityCondition() {
    return `
        r.is_active = 1
        AND rt.is_active = 1
        AND r.operational_status <> 'MAINTENANCE'
        AND (
            r.operational_status = 'AVAILABLE'
            OR (
                ? > ?
                AND (
                    r.operational_status = 'CLEANING'
                    OR (
                        r.operational_status = 'OCCUPIED'
                        AND EXISTS (
                            SELECT 1 FROM stays current_stay
                            WHERE current_stay.room_id = r.id
                              AND current_stay.status = 'ACTIVE'
                              AND current_stay.scheduled_check_out_at > ?
                        )
                    )
                )
            )
        )
        AND NOT EXISTS (
            SELECT 1 FROM reservations b
            WHERE b.room_id = r.id
              AND b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
              AND b.start_at < ?
              AND b.end_at > ?
        )
        AND NOT EXISTS (
            SELECT 1 FROM stays s
            WHERE s.room_id = r.id
              AND s.status = 'ACTIVE'
              AND (
                  s.scheduled_check_out_at <= ?
                  OR (
                      s.check_in_at < ?
                      AND s.scheduled_check_out_at > ?
                  )
              )
        )
    `;
}

function availabilityParams(startAt, endAt, now) {
    return [startAt, now, now, endAt, startAt, now, endAt, startAt];
}

// =====================================================
// CONSULTAR HABITACIONES DISPONIBLES
// =====================================================

export async function getBookingRooms(startAt, endAt) {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT
            r.id,
            r.number,
            r.floor,
            rt.name AS room_type,
            rt.capacity,
            r.operational_status,

            (
                SELECT rr.price_cents
                FROM room_rates rr
                WHERE rr.room_id = r.id
                  AND rr.billing_mode = 'HOURLY'
                  AND rr.is_active = 1
                LIMIT 1
            ) AS hourly_price_cents,

            (
                SELECT rr.price_cents
                FROM room_rates rr
                WHERE rr.room_id = r.id
                  AND rr.billing_mode = 'NIGHTLY'
                  AND rr.is_active = 1
                LIMIT 1
            ) AS nightly_price_cents

        FROM rooms r

        JOIN room_types rt
            ON rt.id = r.room_type_id

        WHERE ${availabilityCondition()}

        ORDER BY r.number COLLATE NOCASE
    `, availabilityParams(startAt, endAt, localTimestamp()));
}

export async function createBooking(data) {
    const db = await getDatabase();

    let createdBookingId = null;

    await db.withExclusiveTransactionAsync(async tx => {

        // -------------------------------------------------
        // 1. Validar disponibilidad de la habitación
        // -------------------------------------------------

        const room = await tx.getFirstAsync(`
            SELECT r.id
            FROM rooms r

            JOIN room_types rt
                ON rt.id = r.room_type_id

            WHERE r.id = ?
              AND ${availabilityCondition()}

            LIMIT 1
        `, [data.roomId, ...availabilityParams(data.startAt, data.endAt, localTimestamp())]);

        if (!room) {
            throw new Error(
                "La habitación no está disponible para las fechas seleccionadas."
            );
        }

        // -------------------------------------------------
        // 2. Buscar huésped existente
        // -------------------------------------------------

        let guestId = null;

        if (data.documentType && data.documentNumber) {
            const existing = await tx.getFirstAsync(`
                SELECT id
                FROM guests
                WHERE document_type = ?
                  AND document_number = ?
                LIMIT 1
            `, [
                data.documentType,
                data.documentNumber,
            ]);

            guestId = existing?.id ?? null;
        }

        // -------------------------------------------------
        // 3. Crear o actualizar huésped
        // -------------------------------------------------

        if (!guestId) {
            const guest = await tx.runAsync(`
                INSERT INTO guests (
                    first_name,
                    last_name,
                    document_type,
                    document_number,
                    phone,
                    nationality,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                data.firstName,
                data.lastName,
                data.documentType || null,
                data.documentNumber || null,
                data.phone || null,
                data.nationality || null,
                new Date().toISOString(),
            ]);

            guestId = guest.lastInsertRowId;

        } else {
            // Actualizar solo información de contacto.
            await tx.runAsync(`
                UPDATE guests
                SET phone = COALESCE(
                    NULLIF(?, ''),
                    phone
                )
                WHERE id = ?
            `, [
                data.phone || null,
                guestId,
            ]);
        }

        // -------------------------------------------------
        // 4. Crear reserva
        // -------------------------------------------------

        const now = new Date().toISOString();

        const sentenceInsertReservation = `INSERT INTO reservations (room_id, guest_id, billing_mode, start_at, end_at, status, agreed_price_cents, notes, booking_origin, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`

        const result = await tx.runAsync(sentenceInsertReservation, [ data.roomId, guestId, data.billingMode, data.startAt, data.endAt, data.priceCents, data.notes || null, data.bookingOrigin || 'DIRECT', now]);

        const bookingId = Number(result.lastInsertRowId);

        console.log("[CREATE BOOKING] ID SQLite:", bookingId);

        if (!bookingId) throw new Error("No se pudo generar el identificador de la reserva.");

        // -------------------------------------------------
        // 5. Generar código de reserva
        // -------------------------------------------------

        const bookingCode = `RSV-${String(bookingId).padStart(6, "0")}`;

        // -------------------------------------------------
        // 6. Generar token QR único
        // -------------------------------------------------

        const qrToken = Crypto.randomUUID();

        // -------------------------------------------------
        // 7. Guardar código y token
        // -------------------------------------------------

        const identityResult = await tx.runAsync(`
            UPDATE reservations
            SET
                booking_code = ?,
                qr_token = ?
            WHERE id = ?
        `, [
            bookingCode,
            qrToken,
            bookingId,
        ]);

        if (identityResult.changes !== 1) {
            throw new Error(
                "No se pudo asignar la identidad de la reserva."
            );
        }

        // -------------------------------------------------
        // 8. Verificar datos guardados
        // -------------------------------------------------

        const savedBooking = await tx.getFirstAsync(`
            SELECT
                id,
                booking_code,
                qr_token
            FROM reservations
            WHERE id = ?
            LIMIT 1
        `, [bookingId]);

        if (!savedBooking ||!savedBooking.booking_code ||!savedBooking.qr_token) throw new Error("La reserva no pudo verificarse correctamente.");

        if (data.depositCents > 0) {
            const session = await tx.getFirstAsync(
                "SELECT id FROM cash_sessions WHERE status = 'OPEN' LIMIT 1"
            );
            if (!session) {
                throw new Error("Debes abrir una caja para registrar un adelanto.");
            }
            const movement = await tx.runAsync(`
                INSERT INTO cash_movements
                    (session_id, type, category, description, amount_cents, payment_method, created_at)
                VALUES (?, 'INCOME', 'Cobro de hospedaje', ?, ?, ?, ?)
            `, [
                session.id, `Adelanto reserva ${bookingCode}`,
                data.depositCents, data.depositMethod, now,
            ]);
            await tx.runAsync(`
                INSERT INTO payments
                    (reservation_id, amount_cents, method, type, reference, notes, cash_movement_id, created_at)
                VALUES (?, ?, ?, 'PAYMENT', ?, ?, ?, ?)
            `, [
                bookingId, data.depositCents, data.depositMethod,
                data.depositReference || null, "Adelanto inicial de reserva",
                movement.lastInsertRowId, now,
            ]);
        }

        createdBookingId = bookingId;
    });

    if (!Number.isSafeInteger(createdBookingId) || createdBookingId <= 0) throw new Error("No se pudo obtener el identificador de la reserva.");

    console.log("[CREATE BOOKING] Resultado:", createdBookingId);

    return createdBookingId;

}

export async function getBookingConfirmation(id) {
    const db = await getDatabase();

    return db.getFirstAsync(`
        SELECT
            b.id,
            b.booking_code,
            b.qr_token,
            b.status,
            b.start_at,
            b.end_at,
            b.billing_mode,
            b.agreed_price_cents,
            b.notes,
            b.booking_origin,
            r.number AS room_number,
            r.floor AS room_floor,
            rt.name AS room_type,
            g.first_name,
            g.last_name,
            g.document_type,
            g.document_number,
            g.phone,
            h.name AS hotel_name,
            h.nombre_comercial,
            h.razon_social,
            h.ruc AS hotel_ruc,
            h.direccion AS hotel_address,
            h.departamento,
            h.provincia,
            h.distrito,
            h.telefono AS hotel_phone,
            h.email AS hotel_email,
            h.logo_uri AS hotel_logo
        FROM reservations b
        JOIN rooms r ON r.id = b.room_id
        JOIN room_types rt ON rt.id = r.room_type_id
        JOIN guests g ON g.id = b.guest_id
        LEFT JOIN hotel_settings h ON h.id = 1
        WHERE b.id = ?
        LIMIT 1
    `, [id]);
}

export async function findBookingByQrToken(token) {
    const db = await getDatabase();

    return db.getFirstAsync(`
        SELECT id, booking_code, status
        FROM reservations
        WHERE qr_token = ?
        LIMIT 1
    `, [token]);
}

export async function assignBookingIdentity(id) {
    const db = await getDatabase();

    const token = Crypto.randomUUID();

    await db.withExclusiveTransactionAsync(async tx => {
        const result = await tx.runAsync(`
            UPDATE reservations
            SET booking_code = COALESCE(
                    booking_code,
                    'RSV-' || printf('%06d', id)
                ),
                qr_token = COALESCE(qr_token, ?)
            WHERE id = ?
        `, [token, id]);

        if (!result.changes) {
            throw new Error("Reserva no encontrada.");
        }
    });

    return getBookingConfirmation(id);
}

export async function updateBooking(id, data) {
    const db = await getDatabase();

    let transactionResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
        // 1. Verificar reserva existente.
        const booking = await tx.getFirstAsync(
            "SELECT * FROM reservations WHERE id = ?",
            [id]
        );

        if (!booking) {
            throw new Error("La reserva no existe.");
        }

        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
            throw new Error(
                "Esta reserva ya no puede modificarse."
            );
        }

        // 2. Validar datos.
        const roomId = Number(data.roomId);
        const priceCents = Number(data.priceCents);

        if (!Number.isSafeInteger(roomId) || roomId <= 0) {
            throw new Error("Selecciona una habitación válida.");
        }

        if (!["HOURLY", "NIGHTLY"].includes(data.billingMode)) {
            throw new Error("Modalidad inválida.");
        }

        if (
            !data.startAt ||
            !data.endAt ||
            data.startAt >= data.endAt
        ) {
            throw new Error(
                "La fecha de salida debe ser posterior al ingreso."
            );
        }

        if (
            !Number.isSafeInteger(priceCents) ||
            priceCents < 0
        ) {
            throw new Error("El precio no es válido.");
        }

        // 3. Verificar habitación habilitada.
        const room = await tx.getFirstAsync(`
            SELECT r.id
            FROM rooms r
            JOIN room_types rt
                ON rt.id = r.room_type_id
            WHERE r.id = ?
              AND r.is_active = 1
              AND rt.is_active = 1
              AND r.operational_status = 'AVAILABLE'
            LIMIT 1
        `, [roomId]);

        if (!room) {
            throw new Error(
                "La habitación no está disponible. Verifica si está ocupada, en limpieza o mantenimiento."
            );
        }

        // 4. Buscar reservas que se superpongan.
        // Excluir la propia reserva.
        const conflict = await tx.getFirstAsync(`
            SELECT id
            FROM reservations
            WHERE room_id = ?
              AND id <> ?
              AND status IN (
                  'PENDING',
                  'CONFIRMED'
              )
              AND start_at < ?
              AND end_at > ?
            LIMIT 1
        `, [
            roomId,
            id,
            data.endAt,
            data.startAt,
        ]);

        if (conflict) {
            throw new Error(
                "La habitación ya tiene otra reserva en el horario seleccionado."
            );
        }

        // 5. Verificar cualquier estadía activa.
        // No depender de la salida programada.
        const activeStay = await tx.getFirstAsync(`
            SELECT id
            FROM stays
            WHERE room_id = ?
              AND status = 'ACTIVE'
            LIMIT 1
        `, [roomId]);

        if (activeStay) {
            throw new Error(
                "La habitación tiene una estadía activa. Debe realizarse el check-out antes de volver a reservar."
            );
        }

        // 6. Actualizar reserva.
        const result = await tx.runAsync(`
            UPDATE reservations
            SET
                room_id = ?,
                billing_mode = ?,
                start_at = ?,
                end_at = ?,
                agreed_price_cents = ?,
                notes = ?
            WHERE id = ?
              AND status IN ('PENDING', 'CONFIRMED')
        `, [
            roomId,
            data.billingMode,
            data.startAt,
            data.endAt,
            priceCents,
            data.notes?.trim() || null,
            id,
        ]);

        if (result.changes !== 1) {
            throw new Error(
                "No se pudo actualizar la reserva."
            );
        }

        transactionResult = true;
    });
    return transactionResult;
}

export async function cancelBooking(id) {
    const db = await getDatabase();

    let transactionResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const booking = await tx.getFirstAsync(
            "SELECT * FROM reservations WHERE id = ?",
            [id]
        );

        if (!booking) {
            throw new Error("La reserva no existe.");
        }

        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
            throw new Error(
                "Solo puedes cancelar reservas pendientes o confirmadas."
            );
        }

        const stay = await tx.getFirstAsync(
            `
            SELECT id
            FROM stays
            WHERE reservation_id = ?
            LIMIT 1
            `,
            [id]
        );

        if (stay) {
            throw new Error(
                "Esta reserva ya tiene un registro de hospedaje."
            );
        }

        const result = await tx.runAsync(
            `
            UPDATE reservations
            SET status = 'CANCELLED'
            WHERE id = ?
              AND status IN ('PENDING', 'CONFIRMED')
            `,
            [id]
        );

        if (result.changes !== 1) {
            throw new Error(
                "No se pudo cancelar la reserva."
            );
        }

        transactionResult = true;
    });
    return transactionResult;
}