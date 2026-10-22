import { initializeDatabase } from "../database";
import { getDatabase } from "../index";

export async function saveHotelProfile(profile) {
    const db = await initializeDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        `
        UPDATE hotel_settings
        SET
            ruc = ?,
            razon_social = ?,
            nombre_comercial = ?,
            estado_ruc = ?,
            condicion_ruc = ?,
            name = ?,
            tipo_establecimiento = ?,
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
            is_configured = 1,
            created_at = COALESCE(created_at, ?),
            updated_at = ?
        WHERE id = 1
        `,
        [
            profile.ruc,
            profile.razonSocial,
            profile.nombreComercial || "",
            profile.estadoRuc || "",
            profile.condicionRuc || "",
            profile.nombreHotel,
            profile.tipoEstablecimiento,
            profile.direccion,
            profile.departamento,
            profile.provincia,
            profile.distrito,
            profile.telefono || "",
            profile.email || "",
            profile.logoUri || "",
            profile.licenciaMunicipal || "",
            profile.registroHospedaje || "",
            profile.consultaRuc?.realizada ? 1 : 0,
            profile.consultaRuc?.fecha || null,
            now,
            now,
        ]
    );

    return getHotelProfile();
}

export async function getHotelProfile() {
    const db = await initializeDatabase();

    const row = await db.getFirstAsync(`
        SELECT *
        FROM hotel_settings
        WHERE id = 1
    `);

    if (!row || row.is_configured !== 1) {
        return null;
    }

    return {
        ...row,
        nombre_hotel: row.name,
    };
}

export async function hasHotelProfile() {
    const profile = await getHotelProfile();
    return profile !== null;
}

const EDITABLE_FIELDS = new Set([
    "name",
    "ruc",
    "razon_social",
    "nombre_comercial",
    "estado_ruc",
    "condicion_ruc",
    "tipo_establecimiento",
    "domicilio_fiscal",
    "direccion",
    "departamento",
    "provincia",
    "distrito",
    "telefono",
    "email",
    "logo_uri",
    "licencia_municipal",
    "registro_hospedaje",
]);

export async function getHotelDetails() {
    const db = await getDatabase();

    return db.getFirstAsync(`
        SELECT *
        FROM hotel_settings
        WHERE id = 1
    `);
}

export async function updateHotelDetails(data) {
    const db = await getDatabase();

    const entries = Object.entries(data).filter(
        ([key]) => EDITABLE_FIELDS.has(key)
    );

    if (!entries.length) {
        throw new Error(
            "No hay campos para actualizar."
        );
    }

    if (
        "name" in data &&
        !String(data.name || "").trim()
    ) {
        throw new Error(
            "El nombre del hotel es obligatorio."
        );
    }

    if ("ruc" in data) {
        const ruc = String(data.ruc || "").trim();

        if (ruc && !/^\d{11}$/.test(ruc)) {
            throw new Error(
                "El RUC debe contener 11 dígitos."
            );
        }
    }

    if ("email" in data) {
        const email = String(data.email || "").trim();

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            throw new Error(
                "Ingresa un correo válido."
            );
        }
    }

    const assignments = entries
        .map(([key]) => `${key} = ?`)
        .join(", ");

    const values = entries.map(([, value]) =>
        value == null
            ? null
            : String(value).trim() || null
    );

    const result = await db.runAsync(
        `
        UPDATE hotel_settings
        SET ${assignments},
            updated_at = ?
        WHERE id = 1
        `,
        [
            ...values,
            new Date().toISOString(),
        ]
    );

    if (result.changes === 0) {
        throw new Error(
            "No se encontró el registro del hotel."
        );
    }

    return getHotelDetails();
}
