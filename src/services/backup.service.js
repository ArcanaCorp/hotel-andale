
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

import { getDatabase } from "../database";

const ROOT = FileSystem.documentDirectory;
const BACKUP_DIR = `${ROOT}backups/`;
const HOTEL_DIR = `${ROOT}hotel/`;

const DATABASE_NAME = "hotel_andale.db";

const SETTINGS_FILE = `${BACKUP_DIR}settings.json`;

const DEFAULT_SETTINGS = {
    frequency: "DAILY",
    retention: 7,
    lastAutomaticAt: null,
};

async function ensureDirectory(path) {
    await FileSystem.makeDirectoryAsync(path, {
        intermediates: true,
    });
}

async function exists(path) {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
}

async function readSettings() {
    await ensureDirectory(BACKUP_DIR);

    if (!(await exists(SETTINGS_FILE))) {
        return { ...DEFAULT_SETTINGS };
    }

    try {
        const content = await FileSystem.readAsStringAsync(
            SETTINGS_FILE
        );

        return {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(content),
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export async function getBackupSettings() {
    return readSettings();
}

export async function saveBackupSettings(patch) {
    const current = await readSettings();

    const next = {
        ...current,
        ...patch,
    };

    if (
        !["OFF", "DAILY", "WEEKLY", "MONTHLY"]
            .includes(next.frequency)
    ) {
        throw new Error("Frecuencia inválida.");
    }

    if (![3, 7, 15, 30].includes(next.retention)) {
        throw new Error("Retención inválida.");
    }

    await FileSystem.writeAsStringAsync(
        SETTINGS_FILE,
        JSON.stringify(next)
    );

    return next;
}

function backupFilename() {
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    return `hotel-andale-${timestamp}.zip`;
}

async function addDirectoryToZip(
    zip,
    directory,
    zipPrefix
) {
    if (!(await exists(directory))) return;

    const names = await FileSystem.readDirectoryAsync(
        directory
    );

    for (const name of names) {
        const path = `${directory}${name}`;
        const info = await FileSystem.getInfoAsync(path);

        if (info.isDirectory) {
            await addDirectoryToZip(
                zip,
                `${path}/`,
                `${zipPrefix}${name}/`
            );
        } else {
            const content =
                await FileSystem.readAsStringAsync(path, {
                    encoding:
                        FileSystem.EncodingType.Base64,
                });

            zip.file(
                `${zipPrefix}${name}`,
                content,
                { base64: true }
            );
        }
    }
}

export async function listBackups() {
    await ensureDirectory(BACKUP_DIR);

    const names = await FileSystem.readDirectoryAsync(
        BACKUP_DIR
    );

    const files = [];

    for (const name of names) {
        if (
            !name.startsWith("hotel-andale-") ||
            !name.endsWith(".zip")
        ) {
            continue;
        }

        const uri = `${BACKUP_DIR}${name}`;
        const info = await FileSystem.getInfoAsync(uri);

        if (!info.exists) continue;

        files.push({
            name,
            uri,
            size: info.size || 0,
            modifiedAt: info.modificationTime
                ? new Date(
                    info.modificationTime * 1000
                ).toISOString()
                : null,
        });
    }

    return files.sort((a, b) =>
        b.name.localeCompare(a.name)
    );
}

export async function deleteBackup(uri) {
    const backups = await listBackups();

    if (!backups.some(item => item.uri === uri)) {
        throw new Error(
            "La copia seleccionada no existe."
        );
    }

    await FileSystem.deleteAsync(uri, {
        idempotent: true,
    });
}

async function enforceRetention() {
    const settings = await readSettings();
    const backups = await listBackups();

    for (const backup of backups.slice(
        settings.retention
    )) {
        await FileSystem.deleteAsync(backup.uri, {
            idempotent: true,
        });
    }
}


export async function createBackup({
    automatic = false,
} = {}) {
    await ensureDirectory(BACKUP_DIR);

    const db = await getDatabase();

    const filename = backupFilename();
    const destination = `${BACKUP_DIR}${filename}`;

    // Ruta temporal única para la copia SQLite.
    const snapshot = `${BACKUP_DIR}snapshot-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.db`;

    // SQLite necesita una ruta nativa, sin file://.
    const sqlitePath = decodeURIComponent(
        snapshot.replace(/^file:\/\//, "")
    );

    // Escapar comillas simples para SQL.
    const escapedPath = sqlitePath.replace(/'/g, "''");

    try {
        // Crear una copia consistente de SQLite,
        // compatible con bases que utilizan WAL.
        await db.execAsync(
            `VACUUM INTO '${escapedPath}';`
        );

        // Confirmar que el archivo se creó.
        const snapshotInfo =
            await FileSystem.getInfoAsync(snapshot);

        if (
            !snapshotInfo.exists ||
            !snapshotInfo.size
        ) {
            throw new Error(
                "No se pudo generar la copia de la base de datos."
            );
        }

        const zip = new JSZip();

        // Incluir SQLite en el respaldo.
        const databaseBase64 =
            await FileSystem.readAsStringAsync(
                snapshot,
                {
                    encoding:
                        FileSystem.EncodingType.Base64,
                }
            );

        zip.file(
            "database/hotel_andale.db",
            databaseBase64,
            { base64: true }
        );

        // Incluir imágenes y archivos locales.
        await addDirectoryToZip(
            zip,
            HOTEL_DIR,
            "files/hotel/"
        );

        // Información del respaldo.
        const manifest = {
            format: "HOTEL_ANDALE_BACKUP",
            formatVersion: 1,
            databaseName: DATABASE_NAME,
            createdAt: new Date().toISOString(),
            automatic,
        };

        zip.file(
            "manifest.json",
            JSON.stringify(manifest, null, 2)
        );

        // Comprimir todos los archivos.
        const content = await zip.generateAsync({
            type: "base64",
            compression: "DEFLATE",
            compressionOptions: {
                level: 6,
            },
        });

        // Guardar ZIP en almacenamiento local.
        await FileSystem.writeAsStringAsync(
            destination,
            content,
            {
                encoding:
                    FileSystem.EncodingType.Base64,
            }
        );

        // Confirmar que el ZIP existe.
        const backupInfo =
            await FileSystem.getInfoAsync(destination);

        if (
            !backupInfo.exists ||
            !backupInfo.size
        ) {
            throw new Error(
                "No se pudo guardar el archivo ZIP."
            );
        }

        // Registrar fecha de copia automática.
        if (automatic) {
            await saveBackupSettings({
                lastAutomaticAt: manifest.createdAt,
            });
        }

        // Eliminar copias antiguas según retención.
        await enforceRetention();

        return {
            name: filename,
            uri: destination,
            size: backupInfo.size,
            createdAt: manifest.createdAt,
        };
    } catch (error) {
        // Evitar dejar ZIP incompletos.
        await FileSystem.deleteAsync(destination, {
            idempotent: true,
        }).catch(() => {});

        console.error(
            "Error al crear copia de seguridad:",
            error
        );

        throw error;
    } finally {
        // Eliminar siempre la copia temporal SQLite.
        await FileSystem.deleteAsync(snapshot, {
            idempotent: true,
        }).catch(() => {});
    }
}


export async function exportBackup(uri) {
    const backups = await listBackups();

    if (!backups.some(item => item.uri === uri)) {
        throw new Error("Copia no encontrada.");
    }

    const available =
        await Sharing.isAvailableAsync();

    if (!available) {
        throw new Error(
            "No se puede exportar en este dispositivo."
        );
    }

    await Sharing.shareAsync(uri, {
        mimeType: "application/zip",
        dialogTitle: "Guardar copia de Hotel Ándale",
        UTI: "public.zip-archive",
    });
}

export async function runAutomaticBackupIfDue() {
    const settings = await readSettings();

    if (settings.frequency === "OFF") {
        return null;
    }

    const backups = await listBackups();

    const last = settings.lastAutomaticAt
        ? new Date(settings.lastAutomaticAt)
        : null;

    const now = new Date();

    // Evita crear copias repetidas en la misma
    // ventana, incluso tras reiniciar la app.
    const lastBackupDate =
        last && !Number.isNaN(last.getTime())
            ? last
            : backups[0]?.modifiedAt
                ? new Date(backups[0].modifiedAt)
                : null;

    if (!lastBackupDate) {
        return createBackup({ automatic: true });
    }

    const next = new Date(lastBackupDate);

    if (settings.frequency === "DAILY") {
        next.setDate(next.getDate() + 1);
    } else if (settings.frequency === "WEEKLY") {
        next.setDate(next.getDate() + 7);
    } else if (settings.frequency === "MONTHLY") {
        next.setMonth(next.getMonth() + 1);
    }

    if (now < next) return null;

    return createBackup({ automatic: true });
}
