
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const ROOT = FileSystem.documentDirectory;
const PENDING = `${ROOT}restore-pending/`;
const STATE = `${PENDING}state.json`;

const DATABASE_NAME = "hotel_andale.db";

const DB_DIR =
    `${FileSystem.documentDirectory}SQLite/`;

const DB_PATH =
    `${DB_DIR}${DATABASE_NAME}`;

async function exists(uri) {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
}

async function ensureDirectory(uri) {
    await FileSystem.makeDirectoryAsync(uri, {
        intermediates: true,
    });
}

async function validateStagedDatabase() {
    const staged = `${PENDING}${DATABASE_NAME}`;

    // Abrimos la copia preparada, nunca la DB activa.
    const db = await SQLite.openDatabaseAsync(
        DATABASE_NAME,
        {
            useNewConnection: true,
        },
        PENDING
    );

    try {
        const result = await db.getFirstAsync(
            "PRAGMA integrity_check"
        );

        if (
            !result ||
            Object.values(result)[0] !== "ok"
        ) {
            throw new Error(
                "La base de datos del respaldo no superó la verificación de integridad."
            );
        }

        const tables = await db.getAllAsync(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
        `);

        const names = new Set(
            tables.map(table => table.name)
        );

        for (const required of [
            "hotel_settings",
            "rooms",
            "room_types",
            "guests",
            "reservations",
            "stays",
            "payments",
        ]) {
            if (!names.has(required)) {
                throw new Error(
                    `Falta la tabla ${required}.`
                );
            }
        }
    } finally {
        await db.closeAsync();
    }

    if (!(await exists(staged))) {
        throw new Error(
            "No se encontró la base de datos preparada."
        );
    }
}

export async function applyPendingRestore() {
    if (!(await exists(STATE))) {
        return false;
    }

    const content =
        await FileSystem.readAsStringAsync(STATE);

    const state = JSON.parse(content);

    if (state.status !== "PENDING") {
        return false;
    }

    await validateStagedDatabase();

    await ensureDirectory(DB_DIR);

    const source =
        `${PENDING}${DATABASE_NAME}`;

    const temporary =
        `${DB_DIR}${DATABASE_NAME}.restore`;

    // La app todavía no debe haber abierto
    // la conexión principal de SQLite.
    await FileSystem.copyAsync({
        from: source,
        to: temporary,
    });

    // IMPORTANTE:
    // Este paso debe implementarse con una
    // estrategia transaccional de reemplazo
    // y recuperación ante interrupciones.
    //
    // No borramos aquí la base de datos activa
    // ni reemplazamos sus archivos WAL.
    //
    // Tampoco sustituimos fotografías todavía.

    throw new Error(
        "Restauración validada y preparada. Falta habilitar el reemplazo seguro de archivos."
    );
}
