import { getDatabase } from "../database";

export async function getHotelProfile() {
    const db = await getDatabase();

    const hotel = await db.getFirstAsync("SELECT * FROM hotel_settings WHERE id = 1");

    if (!hotel) return null;

    return {
        id: hotel.id,
        name: hotel.name || "",
        currency: hotel.currency || "PEN",
        timezone: hotel.timezone || "America/Lima",
        hourlyEnabled: Boolean(hotel.hourly_enabled),
        nightlyEnabled: Boolean(hotel.nightly_enabled),
        checkoutTime: hotel.checkout_time || "12:00",
        lateCheckoutFeeCents: hotel.late_checkout_fee_cents || 0,
        isConfigured: hotel.is_configured === 1
    };
}

export async function saveHotelProfile(data) {
    const db = await getDatabase();

    const name = String(data.name || "").trim();

    if (!name) {
        throw new Error("Ingresa el nombre del establecimiento.");
    }

    
    await db.runAsync(
        `UPDATE hotel_settings
        SET name = ?,
            currency = ?,
            timezone = ?,
            hourly_enabled = ?,
            nightly_enabled = ?,
            checkout_time = ?,
            late_checkout_fee_cents = ?,
            is_configured = 1
        WHERE id = 1`,
        [
            name,
            data.currency || "PEN",
            data.timezone || "America/Lima",
            data.hourlyEnabled ? 1 : 0,
            data.nightlyEnabled ? 1 : 0,
            data.checkoutTime || "12:00",
            data.lateCheckoutFeeCents || 0
        ]
    );

    return getHotelProfile();
}