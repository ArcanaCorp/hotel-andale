
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const ROOT = FileSystem.documentDirectory;

const DB_NAME = "hotel_andale.db";

const DB_DIR = `${ROOT}SQLite/`;
const DB_PATH = `${DB_DIR}${DB_NAME}`;

const PENDING = `${ROOT}restore-pending/`;
const SAFETY = `${ROOT}restore-safety/`;

const STATE_FILE = `${PENDING}state.json`;

const HOTEL_DIR = `${ROOT}hotel/`;

const DB_FILES = [
    DB_NAME,
    `${DB_NAME}-wal`,
    `${DB_NAME}-shm`,
];

async function exists(uri) {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
}

async function ensureDir(uri) {
    await FileSystem.makeDirectoryAsync(uri, {
        intermediates: true,
    });
}

async function remove(uri) {
    await FileSystem.deleteAsync(uri, {
        idempotent: true,
    });
}

async function moveIfExists(from, to) {
    if (!(await exists(from))) return;

    await FileSystem.moveAsync({
        from,
        to,
    });
}

async function copyIfExists(from, to) {
    if (!(await exists(from))) return;

    await FileSystem.copyAsync({
        from,
        to,
    });
}

async function readState() {
    if (!(await exists(STATE_FILE))) {
        return null;
    }

    return JSON.parse(
        await FileSystem.readAsStringAsync(
            STATE_FILE
        )
    );
}

async function writeState(status) {
    const previous = await readState();

    await FileSystem.writeAsStringAsync(
        STATE_FILE,
        JSON.stringify({
            ...previous,
            status,
            updatedAt: new Date().toISOString(),
        })
    );
}

async function validateDatabase() {
    const db = await SQLite.openDatabaseAsync(
        DB_NAME,
        { useNewConnection: true }
    );

    try {
        const result =
            await db.getFirstAsync(
                "PRAGMA integrity_check"
            );

        if (Object.values(result || {})[0] !== "ok") {
            throw new Error(
                "La base de datos restaurada no superó la verificación."
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

async function rollback() {
    // Retirar los archivos restaurados.
    for (const file of DB_FILES) {
        await remove(`${DB_DIR}${file}`);
    }

    // Recuperar los archivos anteriores.
    for (const file of DB_FILES) {
        await moveIfExists(
            `${SAFETY}${file}`,
            `${DB_DIR}${file}`
        );
    }

    await remove(HOTEL_DIR);

    await moveIfExists(
        `${SAFETY}hotel/`,
        HOTEL_DIR
    );

    await writeState("ROLLED_BACK");
}

export async function applyRestoreAtStartup() {
    const state = await readState();

    if (!state) return false;

    if (
        ![
            "PENDING",
            "BACKING_UP",
            "RESTORING",
            "VERIFYING",
        ].includes(state.status)
    ) {
        return false;
    }

    await ensureDir(DB_DIR);
    await ensureDir(SAFETY);

    try {
        if (state.status === "PENDING") {
            await writeState("BACKING_UP");

            // Guardar base de datos anterior.
            for (const file of DB_FILES) {
                await moveIfExists(
                    `${DB_DIR}${file}`,
                    `${SAFETY}${file}`
                );
            }

            // Guardar fotografías anteriores.
            await moveIfExists(
                HOTEL_DIR,
                `${SAFETY}hotel/`
            );

            await writeState("RESTORING");
        } else if (state.status === "BACKING_UP") {
            // La copia preventiva pudo quedar
            // incompleta tras una interrupción.
            // No continuamos con el reemplazo.
            await rollback();
            return false;
        } else if (
            state.status === "RESTORING" ||
            state.status === "VERIFYING"
        ) {
            // Un cierre inesperado pudo dejar
            // datos restaurados parcialmente.
            await rollback();
            return false;
        }

        // Aplicar SQLite.
        await copyIfExists(
            `${PENDING}${DB_NAME}`,
            DB_PATH
        );

        // Aplicar imágenes.
        await copyIfExists(
            `${PENDING}hotel/`,
            HOTEL_DIR
        );

        await writeState("VERIFYING");

        await validateDatabase();

        await writeState("COMPLETED");

        return true;
    } catch (error) {
        try {
            await rollback();
        } catch (rollbackError) {
            throw new Error(
                "Falló la restauración y la recuperación preventiva: " +
                rollbackError.message
            );
        }

        throw error;
    }
}
