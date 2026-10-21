
import * as SQLite from "expo-sqlite";

let databasePromise = null;

export function getDatabase() {
    if (!databasePromise) {
        databasePromise = SQLite.openDatabaseAsync("hotel-andale.db");
    }

    return databasePromise;
}

export async function initializeDatabase() {
    const db = await getDatabase();

    await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS hotel_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            ruc TEXT NOT NULL,
            razon_social TEXT NOT NULL,
            nombre_comercial TEXT,
            estado_ruc TEXT,
            condicion_ruc TEXT,
            nombre_hotel TEXT NOT NULL,
            tipo_establecimiento TEXT NOT NULL,
            direccion TEXT NOT NULL,
            departamento TEXT NOT NULL,
            provincia TEXT NOT NULL,
            distrito TEXT NOT NULL,
            telefono TEXT,
            email TEXT,
            logo_uri TEXT,
            licencia_municipal TEXT,
            registro_hospedaje TEXT,
            consulta_ruc_realizada INTEGER DEFAULT 0,
            consulta_ruc_fecha TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    return db;
}