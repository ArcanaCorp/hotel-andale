
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

import {
    closeDatabaseForRestore,
    finishDatabaseRestore,
    getDatabase,
} from "../database";

const ROOT = FileSystem.documentDirectory;

const DB_DIR = `${ROOT}SQLite/`;
const DB_NAME = "hotel_andale.db";
const DB_PATH = `${DB_DIR}${DB_NAME}`;

const PENDING_DIR = `${ROOT}restore-pending/`;
const PENDING_DB = `${PENDING_DIR}${DB_NAME}`;

const SAFETY_DIR = `${ROOT}restore-safety/`;
const SAFETY_DB = `${SAFETY_DIR}${DB_NAME}`;

async function exists(uri) {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
}

async function ensureDirectory(uri) {
    await FileSystem.makeDirectoryAsync(uri, {
        intermediates: true,
    });
}

async function copyIfExists(from, to) {
    if (await exists(from)) {
        await FileSystem.copyAsync({ from, to });
    }
}

async function removeIfExists(uri) {
    await FileSystem.deleteAsync(uri, {
        idempotent: true,
    });
}

async function validateDatabase(directory) {
    const db = await SQLite.openDatabaseAsync(
        DB_NAME,
        { useNewConnection: true },
        directory
    );

    try {
        const result = await db.getFirstAsync(
            "PRAGMA integrity_check;"
        );

        if (Object.values(result || {})[0] !== "ok") {
            throw new Error(
                "La base de datos no superó la verificación de integridad."
            );
        }

        const tables = await db.getAllAsync(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
        `);

        const names = new Set(
            tables.map(row => row.name)
        );

        for (const name of [
            "hotel_settings",
            "rooms",
            "room_types",
            "guests",
            "reservations",
            "stays",
            "payments",
        ]) {
            if (!names.has(name)) {
                throw new Error(
                    `Falta la tabla ${name}.`
                );
            }
        }
    } finally {
        await db.closeAsync();
    }
}

export async function executePreparedRestore() {
    if (!(await exists(PENDING_DB))) {
        throw new Error(
            "No existe una restauración preparada."
        );
    }

    await validateDatabase(PENDING_DIR);

    // Primero comprobamos que la base actual
    // puede abrirse correctamente.
    await getDatabase();

    await ensureDirectory(SAFETY_DIR);
    await ensureDirectory(DB_DIR);

    let closed = false;
    let replaced = false;

    try {
        await closeDatabaseForRestore();
        closed = true;

        // Guardar estado anterior.
        await removeIfExists(SAFETY_DB);

        await copyIfExists(DB_PATH, SAFETY_DB);

        // Guardar también los archivos WAL y SHM,
        // aunque el checkpoint debería haberlos
        // consolidado previamente.
        await copyIfExists(
            `${DB_PATH}-wal`,
            `${SAFETY_DB}-wal`
        );

        await copyIfExists(
            `${DB_PATH}-shm`,
            `${SAFETY_DB}-shm`
        );

        // El respaldo preparado por VACUUM INTO
        // contiene una base consolidada.
        await removeIfExists(`${DB_PATH}-wal`);
        await removeIfExists(`${DB_PATH}-shm`);

        await removeIfExists(DB_PATH);

        await FileSystem.copyAsync({
            from: PENDING_DB,
            to: DB_PATH,
        });

        replaced = true;

        await validateDatabase(DB_DIR);

        finishDatabaseRestore();
        closed = false;

        // Abrir nuevamente y ejecutar migraciones.
        await getDatabase();

        // La restauración de fotografías se hará
        // en una etapa separada, antes de eliminar
        // la copia preventiva.

        return {
            success: true,
            message:
                "Base de datos restaurada correctamente.",
        };
    } catch (error) {
        if (closed || replaced) {
            try {
                // Si ya se abrió una conexión sobre
                // la base restaurada, debemos cerrarla
                // antes de revertir.
                if (!closed) {
                    await closeDatabaseForRestore();
                    closed = true;
                }

                if (await exists(SAFETY_DB)) {
                    await removeIfExists(DB_PATH);
                    await removeIfExists(
                        `${DB_PATH}-wal`
                    );
                    await removeIfExists(
                        `${DB_PATH}-shm`
                    );

                    await FileSystem.copyAsync({
                        from: SAFETY_DB,
                        to: DB_PATH,
                    });

                    await copyIfExists(
                        `${SAFETY_DB}-wal`,
                        `${DB_PATH}-wal`
                    );

                    await copyIfExists(
                        `${SAFETY_DB}-shm`,
                        `${DB_PATH}-shm`
                    );
                }
            } catch (rollbackError) {
                throw new Error(
                    "La restauración falló y no se pudo recuperar automáticamente la base anterior: " +
                    rollbackError.message
                );
            }
        }

        throw error;
    } finally {
        finishDatabaseRestore();
    }
}
