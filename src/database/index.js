
import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";
import { applyRestoreAtStartup } from "../services/restore-startup.service";

const DATABASE_NAME = "hotel_andale.db";

let databasePromise = null;
let maintenanceMode = false;

async function openDatabase() {

    await applyRestoreAtStartup();

    const db = await SQLite.openDatabaseAsync(
        DATABASE_NAME
    );

    try {
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
        `);

        await runMigrations(db);

        return db;
    } catch (error) {
        await db.closeAsync().catch(() => {});
        throw error;
    }
}

export async function getDatabase() {
    if (maintenanceMode) {
        throw new Error(
            "La base de datos está en mantenimiento."
        );
    }

    if (!databasePromise) {
        databasePromise = openDatabase().catch(
            error => {
                databasePromise = null;
                throw error;
            }
        );
    }

    return databasePromise;
}

export async function closeDatabaseForRestore() {
    if (maintenanceMode) {
        throw new Error(
            "Ya existe una operación de mantenimiento."
        );
    }

    maintenanceMode = true;

    try {
        if (databasePromise) {
            const db = await databasePromise;

            // Consolidar las escrituras pendientes.
            await db.execAsync(
                "PRAGMA wal_checkpoint(TRUNCATE);"
            );

            await db.closeAsync();
            databasePromise = null;
        }
    } catch (error) {
        maintenanceMode = false;
        throw error;
    }
}

export function finishDatabaseRestore() {
    databasePromise = null;
    maintenanceMode = false;
}

export function isDatabaseInMaintenance() {
    return maintenanceMode;
}
