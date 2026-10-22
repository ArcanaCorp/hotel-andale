import * as SQLite from "expo-sqlite";
import { getDatabase as getMainDatabase } from "./index";

let initializationPromise = null;

export function getDatabase() {
    return getMainDatabase();
}

export function initializeDatabase() {
    if (!initializationPromise) {
        initializationPromise = migrateLegacyProfile()
            .catch(error => {
                initializationPromise = null;
                throw error;
            });
    }

    return initializationPromise;
}

async function migrateLegacyProfile() {
    const db = await getMainDatabase();

    // Base de datos anterior del onboarding.
    const legacyDb = await SQLite.openDatabaseAsync(
        "hotel-andale.db"
    );

    try {
        const table = await legacyDb.getFirstAsync(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = 'hotel_profile'
        `);

        if (!table) return db;

        const profile = await legacyDb.getFirstAsync(`
            SELECT *
            FROM hotel_profile
            WHERE id = 1
        `);

        if (!profile) return db;

        // No sobrescribir una configuración ya migrada.
        const current = await db.getFirstAsync(`
            SELECT *
            FROM hotel_settings
            WHERE id = 1
        `);

        if (current?.ruc || current?.is_configured === 1) {
            return db;
        }

        await db.runAsync(
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
                created_at = ?,
                updated_at = ?,
                is_configured = 1
            WHERE id = 1
            `,
            [
                profile.nombre_hotel,
                profile.ruc,
                profile.razon_social,
                profile.nombre_comercial,
                profile.estado_ruc,
                profile.condicion_ruc,
                profile.tipo_establecimiento,
                profile.direccion,
                profile.departamento,
                profile.provincia,
                profile.distrito,
                profile.telefono,
                profile.email,
                profile.logo_uri,
                profile.licencia_municipal,
                profile.registro_hospedaje,
                profile.consulta_ruc_realizada,
                profile.consulta_ruc_fecha,
                profile.created_at,
                new Date().toISOString(),
            ]
        );

        return db;
    } finally {
        await legacyDb.closeAsync();
    }
}