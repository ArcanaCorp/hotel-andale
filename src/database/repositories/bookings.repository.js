import * as Crypto from "expo-crypto";
import { getDatabase } from "../index";

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
        JOIN room_types rt ON rt.id = r.room_type_id
        WHERE r.is_active = 1
          AND rt.is_active = 1
          AND r.operational_status NOT IN (
              'MAINTENANCE', 'CLEANING'
          )
          AND NOT EXISTS (
              SELECT 1
              FROM reservations b
              WHERE b.room_id = r.id
                AND b.status IN (
                    'PENDING', 'CONFIRMED', 'CHECKED_IN'
                )
                AND b.start_at < ?
                AND b.end_at > ?
          )
          AND NOT EXISTS (
              SELECT 1
              FROM stays s
              WHERE s.room_id = r.id
                AND s.status = 'ACTIVE'
                AND s.check_in_at < ?
                AND s.scheduled_check_out_at > ?
          )
        ORDER BY r.number COLLATE NOCASE
    `, [endAt, startAt, endAt, startAt]);
}

export async function createBooking(data) {
    const db = await getDatabase();

    return db.withExclusiveTransactionAsync(async tx => {
        // 1. Validar disponibilidad de la habitación.
        const room = await tx.getFirstAsync(`
            SELECT r.id
            FROM rooms r
            WHERE r.id = ?
              AND r.is_active = 1
              AND r.operational_status NOT IN (
                  'MAINTENANCE',
                  'CLEANING'
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM reservations b
                  WHERE b.room_id = r.id
                    AND b.status IN (
                        'PENDING',
                        'CONFIRMED',
                        'CHECKED_IN'
                    )
                    AND b.start_at < ?
                    AND b.end_at > ?
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM stays s
                  WHERE s.room_id = r.id
                    AND s.status = 'ACTIVE'
                    AND s.check_in_at < ?
                    AND s.scheduled_check_out_at > ?
              )
        `, [
            data.roomId,
            data.endAt,
            data.startAt,
            data.endAt,
            data.startAt,
        ]);

        if (!room) {
            throw new Error(
                "La habitación no está disponible para las fechas seleccionadas."
            );
        }

        // 2. Buscar huésped existente.
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

        // 3. Crear huésped si no existe.
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
            // Actualizar únicamente datos de contacto.
            // No sobrescribir la identidad ya registrada.
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

        // 4. Crear reserva.
        const result = await tx.runAsync(`
            INSERT INTO reservations (
                room_id,
                guest_id,
                billing_mode,
                start_at,
                end_at,
                status,
                agreed_price_cents,
                notes,
                created_at
            )
            VALUES (
                ?, ?, ?, ?, ?,
                'PENDING', ?, ?, ?
            )
        `, [
            data.roomId,
            guestId,
            data.billingMode,
            data.startAt,
            data.endAt,
            data.priceCents,
            data.notes || null,
            new Date().toISOString(),
        ]);

        const bookingId = result.lastInsertRowId;

        // 5. Generar código visible de reserva.
        const bookingCode =
            `RSV-${String(bookingId).padStart(6, "0")}`;

        // 6. Generar token único para el QR.
        const qrToken = Crypto.randomUUID();

        // 7. Guardar identidad de reserva.
        await tx.runAsync(`
            UPDATE reservations
            SET booking_code = ?,
                qr_token = ?
            WHERE id = ?
        `, [
            bookingCode,
            qrToken,
            bookingId,
        ]);

        // 8. Devolver identificador para navegación.
        return bookingId;
    });
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

    return db.withExclusiveTransactionAsync(async tx => {
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

        const roomId = Number(data.roomId);
        const priceCents = Number(data.priceCents);

        if (!Number.isSafeInteger(roomId) || roomId <= 0) {
            throw new Error("Selecciona una habitación válida.");
        }

        if (
            !["HOURLY", "NIGHTLY"].includes(data.billingMode)
        ) {
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

        const room = await tx.getFirstAsync(
            `
            SELECT id
            FROM rooms
            WHERE id = ?
              AND is_active = 1
              AND operational_status NOT IN (
                  'MAINTENANCE', 'CLEANING'
              )
            LIMIT 1
            `,
            [roomId]
        );

        if (!room) {
            throw new Error(
                "La habitación seleccionada no está habilitada."
            );
        }

        const conflict = await tx.getFirstAsync(
            `
            SELECT id
            FROM reservations
            WHERE room_id = ?
              AND id <> ?
              AND status IN (
                  'PENDING', 'CONFIRMED', 'CHECKED_IN'
              )
              AND start_at < ?
              AND end_at > ?
            LIMIT 1
            `,
            [
                roomId,
                id,
                data.endAt,
                data.startAt,
            ]
        );

        if (conflict) {
            throw new Error(
                "La habitación ya tiene una reserva en ese horario."
            );
        }

        const activeStay = await tx.getFirstAsync(
            `
            SELECT id
            FROM stays
            WHERE room_id = ?
              AND status = 'ACTIVE'
              AND check_in_at < ?
              AND scheduled_check_out_at > ?
            LIMIT 1
            `,
            [
                roomId,
                data.endAt,
                data.startAt,
            ]
        );

        if (activeStay) {
            throw new Error(
                "La habitación tiene una estadía activa en ese horario."
            );
        }

        await tx.runAsync(
            `
            UPDATE reservations
            SET
                room_id = ?,
                billing_mode = ?,
                start_at = ?,
                end_at = ?,
                agreed_price_cents = ?,
                notes = ?
            WHERE id = ?
            `,
            [
                roomId,
                data.billingMode,
                data.startAt,
                data.endAt,
                priceCents,
                data.notes?.trim() || null,
                id,
            ]
        );

        return true;
    });
}

export async function cancelBooking(id) {
    const db = await getDatabase();

    return db.withExclusiveTransactionAsync(async tx => {
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

        return true;
    });
}