import { getDatabase } from "../database";
import { getBookingRooms, createBooking } from "../database/repositories/bookings.repository";

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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function validLocalDate(value) {
    if (!DATE_PATTERN.test(value)) return false;

    const [date, time] = value.split("T");
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const d = new Date(year, month - 1, day, hour, minute);

    return (
        d.getFullYear() === year &&
        d.getMonth() === month - 1 &&
        d.getDate() === day &&
        d.getHours() === hour &&
        d.getMinutes() === minute
    );
}

export function validateBookingDates(startAt, endAt) {
    if (!validLocalDate(startAt) ||
        !validLocalDate(endAt)) {
        throw new Error(
            "Usa fechas válidas: AAAA-MM-DDTHH:mm."
        );
    }

    if (startAt >= endAt) {
        throw new Error(
            "La salida debe ser posterior al ingreso."
        );
    }
}

export async function listAvailableBookingRooms(
    startAt,
    endAt
) {
    validateBookingDates(startAt, endAt);
    return getBookingRooms(startAt, endAt);
}

export async function registerBooking(data) {
    validateBookingDates(data.startAt, data.endAt);

    const firstName = String(data.firstName ?? "").trim();
    const lastName = String(data.lastName ?? "").trim();

    if (!firstName || !lastName) {
        throw new Error(
            "Ingresa los nombres y apellidos del titular."
        );
    }

    if (!Number.isInteger(data.roomId) || data.roomId <= 0) {
        throw new Error("Selecciona una habitación.");
    }

    if (!["HOURLY", "NIGHTLY"].includes(data.billingMode)) {
        throw new Error("Selecciona una modalidad válida.");
    }

    const price = String(data.price ?? "").trim();

    if (!/^\d+([.,]\d{1,2})?$/.test(price)) {
        throw new Error("Ingresa un precio válido.");
    }

    const priceCents = Math.round(
        Number(price.replace(",", ".")) * 100
    );

    if (!Number.isSafeInteger(priceCents) ||
        priceCents <= 0) {
        throw new Error("El precio debe ser mayor a cero.");
    }

    const documentType = data.documentType || null;
    const documentNumber =
        String(data.documentNumber ?? "").trim();

    if (documentNumber && !documentType) {
        throw new Error("Selecciona el tipo de documento.");
    }

    if (documentType && !documentNumber) {
        throw new Error("Ingresa el número de documento.");
    }

    if (documentType === "DNI" &&
        !/^\d{8}$/.test(documentNumber)) {
        throw new Error("El DNI debe tener 8 dígitos.");
    }

    return createBooking({
        roomId: data.roomId,
        firstName,
        lastName,
        phone: String(data.phone ?? "").trim(),
        documentType,
        documentNumber: documentNumber || null,
        nationality:
            String(data.nationality ?? "").trim() || null,
        billingMode: data.billingMode,
        startAt: data.startAt,
        endAt: data.endAt,
        priceCents,
        notes: String(data.notes ?? "").trim(),
    });
}