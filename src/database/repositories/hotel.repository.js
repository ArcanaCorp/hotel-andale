
import { initializeDatabase } from "./database";

export async function saveHotelProfile(profile) {
    const db = await initializeDatabase();

    const now = new Date().toISOString();

    await db.runAsync(
        `
        INSERT INTO hotel_profile (
            id,
            ruc,
            razon_social,
            nombre_comercial,
            estado_ruc,
            condicion_ruc,
            nombre_hotel,
            tipo_establecimiento,
            direccion,
            departamento,
            provincia,
            distrito,
            telefono,
            email,
            logo_uri,
            licencia_municipal,
            registro_hospedaje,
            consulta_ruc_realizada,
            consulta_ruc_fecha,
            created_at,
            updated_at
        )
        VALUES (
            1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
            ruc = excluded.ruc,
            razon_social = excluded.razon_social,
            nombre_comercial = excluded.nombre_comercial,
            estado_ruc = excluded.estado_ruc,
            condicion_ruc = excluded.condicion_ruc,
            nombre_hotel = excluded.nombre_hotel,
            tipo_establecimiento = excluded.tipo_establecimiento,
            direccion = excluded.direccion,
            departamento = excluded.departamento,
            provincia = excluded.provincia,
            distrito = excluded.distrito,
            telefono = excluded.telefono,
            email = excluded.email,
            logo_uri = excluded.logo_uri,
            licencia_municipal = excluded.licencia_municipal,
            registro_hospedaje = excluded.registro_hospedaje,
            consulta_ruc_realizada = excluded.consulta_ruc_realizada,
            consulta_ruc_fecha = excluded.consulta_ruc_fecha,
            updated_at = excluded.updated_at
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
            profile.createdAt || now,
            now,
        ]
    );

    return getHotelProfile();
}

export async function getHotelProfile() {
    const db = await initializeDatabase();

    return db.getFirstAsync(
        "SELECT * FROM hotel_profile WHERE id = 1"
    );
}

export async function hasHotelProfile() {
    const profile = await getHotelProfile();
    return profile !== null;
}