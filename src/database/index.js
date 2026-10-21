import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";

let databasePromise = null;

export async function getDatabase() {
    if (!databasePromise) {
        databasePromise = (async () => {
            const db = await SQLite.openDatabaseAsync("hotel_andale.db");

            await db.execAsync(`
                PRAGMA journal_mode = WAL;
                PRAGMA foreign_keys = ON;
                PRAGMA busy_timeout = 5000;
            `);

            await runMigrations(db);
            return db;
        })().catch((error) => {
            databasePromise = null;
            throw error;
        });
    }

    return databasePromise;
}