
import { getDatabase } from "../database";

const clean = (value) => String(value ?? "").trim();

const optional = (value) => {
    const text = clean(value);
    return text || null;
};

function validateProfile(data) {
    if (!data || typeof data !== "object") {
        throw new Error("Los datos del hotel son inválidos.");
    }

    const ruc = clean(data.ruc);
    const razonSocial = clean(data.razonSocial);
    const nombreHotel = clean(data.nombreHotel || data.name);
    const tipoEstablecimiento = clean(data.tipoEstablecimiento);
    const direccion = clean(data.direccion);
    const departamento = clean(data.departamento);
    const provincia = clean(data.provincia);
    const distrito = clean(data.distrito);

    if (!/^(10|20)\d{9}$/.test(ruc)) {
        throw new Error("Ingresa un RUC válido de 11 dígitos.");
    }

    if (!razonSocial) {
        throw new Error("La razón social es obligatoria.");
    }

    if (!nombreHotel) {
        throw new Error("El nombre del hotel es obligatorio.");
    }

    if (!tipoEstablecimiento) {
        throw new Error("Selecciona el tipo de establecimiento.");
    }

    if (!direccion || !departamento || !provincia || !distrito) {
        throw new Error("Completa la ubicación del establecimiento.");
    }

    const email = clean(data.email).toLowerCase();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("El correo electrónico no es válido.");
    }

    return {
        ruc,
        razonSocial,
        nombreHotel,
        tipoEstablecimiento,
        direccion,
        departamento,
        provincia,
        distrito,
        email,
    };
}

export async function getHotelProfile() {
    const db = await getDatabase();

    const hotel = await db.getFirstAsync(
        "SELECT * FROM hotel_settings WHERE id = 1"
    );

    if (!hotel) return null;

    return {
        id: hotel.id,

        // Identificación del establecimiento
        name: hotel.name || "",
        nombreHotel: hotel.name || "",
        tipoEstablecimiento: hotel.tipo_establecimiento || "",
        logoUri: hotel.logo_uri || "",

        // Identificación legal
        ruc: hotel.ruc || "",
        razonSocial: hotel.razon_social || "",
        nombreComercial: hotel.nombre_comercial || "",
        estadoRuc: hotel.estado_ruc || "",
        condicionRuc: hotel.condicion_ruc || "",

        // Ubicación
        domicilioFiscal: hotel.domicilio_fiscal || "",
        direccion: hotel.direccion || "",
        departamento: hotel.departamento || "",
        provincia: hotel.provincia || "",
        distrito: hotel.distrito || "",

        // Contacto
        telefono: hotel.telefono || "",
        email: hotel.email || "",

        // Información administrativa
        licenciaMunicipal: hotel.licencia_municipal || "",
        registroHospedaje: hotel.registro_hospedaje || "",

        // Consulta RUC
        consultaRuc: {
            realizada: hotel.consulta_ruc_realizada === 1,
            fecha: hotel.consulta_ruc_fecha || null,
        },

        // Configuración operativa
        currency: hotel.currency || "PEN",
        timezone: hotel.timezone || "America/Lima",
        hourlyEnabled: hotel.hourly_enabled === 1,
        nightlyEnabled: hotel.nightly_enabled === 1,
        checkoutTime: hotel.checkout_time || "12:00",
        lateCheckoutFeeCents: hotel.late_checkout_fee_cents ?? 0,

        // Estado del onboarding
        isConfigured: hotel.is_configured === 1,

        // Auditoría
        createdAt: hotel.created_at || null,
        updatedAt: hotel.updated_at || null,
    };
}

export async function saveHotelProfile(data) {
    const validated = validateProfile(data);
    const db = await getDatabase();

    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
        const current = await tx.getFirstAsync(
            "SELECT * FROM hotel_settings WHERE id = 1"
        );

        if (!current) {
            throw new Error(
                "No se encontró la configuración inicial del hotel."
            );
        }

        const isNew = current.is_configured !== 1;

        const currency = data.currency ?? current.currency;
        const timezone = data.timezone ?? current.timezone;

        const hourlyEnabled =
            data.hourlyEnabled === undefined
                ? current.hourly_enabled
                : data.hourlyEnabled ? 1 : 0;

        const nightlyEnabled =
            data.nightlyEnabled === undefined
                ? current.nightly_enabled
                : data.nightlyEnabled ? 1 : 0;

        const checkoutTime =
            data.checkoutTime ?? current.checkout_time;

        const lateCheckoutFeeCents =
            data.lateCheckoutFeeCents ??
            current.late_checkout_fee_cents;

        await tx.runAsync(
            `
            UPDATE hotel_settings
            SET
                name = ?,
                ruc = ?,
                razon_social = ?,
                nombre_comercial = ?,
                estado_ruc = ?,
                condicion_ruc = ?,
                tipo_establecimiento = ?,
                domicilio_fiscal = ?,
                direccion = ?,
                departamento = ?,
                provincia = ?,
                distrito = ?,
                telefono = ?,
                email = ?,
                logo_uri = ?,
                licencia_municipal = ?,
                registro_hospedaje = ?,
                consulta_ruc_realizada = ?,
                consulta_ruc_fecha = ?,
                currency = ?,
                timezone = ?,
                hourly_enabled = ?,
                nightly_enabled = ?,
                checkout_time = ?,
                late_checkout_fee_cents = ?,
                is_configured = 1,
                created_at = ?,
                updated_at = ?
            WHERE id = 1
            `,
            [
                validated.nombreHotel,
                validated.ruc,
                validated.razonSocial,
                optional(data.nombreComercial),
                optional(data.estadoRuc),
                optional(data.condicionRuc),
                validated.tipoEstablecimiento,
                optional(data.domicilioFiscal),
                validated.direccion,
                validated.departamento,
                validated.provincia,
                validated.distrito,
                optional(data.telefono),
                validated.email || null,
                optional(data.logoUri),
                optional(data.licenciaMunicipal),
                optional(data.registroHospedaje),
                data.consultaRuc?.realizada ? 1 : 0,
                data.consultaRuc?.realizada
                    ? optional(data.consultaRuc.fecha)
                    : null,
                currency,
                timezone,
                hourlyEnabled,
                nightlyEnabled,
                checkoutTime,
                lateCheckoutFeeCents,
                isNew ? now : (current.created_at || now),
                now,
            ]
        );
    });

    return getHotelProfile();
}