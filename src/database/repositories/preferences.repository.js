
import { getDatabase } from "../index";

const ALLOWED_CURRENCIES = ["PEN", "USD"];
const ALLOWED_TIMEZONES = [
    "America/Lima",
];

export async function getHotelPreferences() {
    const db = await getDatabase();

    const preferences = await db.getFirstAsync(`
        SELECT
            hourly_enabled,
            nightly_enabled,
            checkout_time,
            night_duration_hours,
            late_checkout_fee_cents,
            currency,
            timezone
        FROM hotel_settings
        WHERE id = 1
    `);

    if (!preferences) {
        throw new Error(
            "No se encontró la configuración del hotel."
        );
    }

    return preferences;
}

export async function updateHotelPreferences(data) {
    const db = await getDatabase();

    const hourlyEnabled = data.hourly_enabled ? 1 : 0;
    const nightlyEnabled = data.nightly_enabled ? 1 : 0;

    if (!hourlyEnabled && !nightlyEnabled) {
        throw new Error(
            "Debes mantener habilitada al menos una modalidad de hospedaje."
        );
    }

    const checkoutTime = String(
        data.checkout_time || ""
    ).trim();

    if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
            checkoutTime
        )
    ) {
        throw new Error(
            "La hora de check-out debe tener formato HH:mm."
        );
    }

    const nightDurationHours = Number(data.night_duration_hours);
    if (!Number.isSafeInteger(nightDurationHours) || nightDurationHours < 1 || nightDurationHours > 24) {
        throw new Error("La duración de una noche debe estar entre 1 y 24 horas.");
    }

    const fee = data.late_checkout_fee_cents;

    if (
        !Number.isSafeInteger(fee) ||
        fee < 0
    ) {
        throw new Error(
            "El recargo por salida tardía no es válido."
        );
    }

    if (
        !ALLOWED_CURRENCIES.includes(
            data.currency
        )
    ) {
        throw new Error(
            "La moneda seleccionada no es válida."
        );
    }

    if (
        !ALLOWED_TIMEZONES.includes(
            data.timezone
        )
    ) {
        throw new Error(
            "La zona horaria no es válida."
        );
    }

    await db.withExclusiveTransactionAsync(
        async tx => {
            const result = await tx.runAsync(
                `
                UPDATE hotel_settings
                SET
                    hourly_enabled = ?,
                    nightly_enabled = ?,
                    checkout_time = ?,
                    night_duration_hours = ?,
                    late_checkout_fee_cents = ?,
                    currency = ?,
                    timezone = ?,
                    updated_at = ?
                WHERE id = 1
                `,
                [
                    hourlyEnabled,
                    nightlyEnabled,
                    checkoutTime,
                    nightDurationHours,
                    fee,
                    data.currency,
                    data.timezone,
                    new Date().toISOString(),
                ]
            );

            if (result.changes !== 1) {
                throw new Error(
                    "No se pudo actualizar la configuración."
                );
            }
        }
    );

    return getHotelPreferences();
}
