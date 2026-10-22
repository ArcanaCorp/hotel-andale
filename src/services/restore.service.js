import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import JSZip from "jszip";
import { validateBackupEntries, validateBackupManifest, validateSQLiteSignature } from "./restore-validation.mjs";

const ROOT = FileSystem.documentDirectory;

const RESTORE_DIR = `${ROOT}restore-pending/`;
const DATABASE_FILE = "database/hotel_andale.db";
const MANIFEST_FILE = "manifest.json";
const STATE_FILE = `${RESTORE_DIR}state.json`;

const MAX_ZIP_BYTES = 250 * 1024 * 1024;
const MAX_DATABASE_BYTES = 150 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;

async function ensureDirectory(path) {
    await FileSystem.makeDirectoryAsync(path, {
        intermediates: true,
    });
}

async function removeDirectory(path) {
    await FileSystem.deleteAsync(path, {
        idempotent: true,
    });
}

export async function selectRestoreFile() {
    const result =
        await DocumentPicker.getDocumentAsync({
            type: [
                "application/zip",
                "application/x-zip-compressed",
            ],
            copyToCacheDirectory: true,
            multiple: false,
        });

    if (result.canceled) return null;

    return result.assets?.[0] || null;
}

export async function inspectRestoreFile(uri) {
    const info = await FileSystem.getInfoAsync(uri);

    if (!info.exists || !info.size) {
        throw new Error(
            "No se encontró el archivo seleccionado."
        );
    }

    if (info.size > MAX_ZIP_BYTES) {
        throw new Error(
            "El archivo supera los 250 MB permitidos."
        );
    }

    const base64 =
        await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

    const zip = await JSZip.loadAsync(base64, {
        checkCRC32: true,
        createFolders: false,
    });

    validateBackupEntries(Object.entries(zip.files).map(([name, entry]) => ({
        name, dir: entry.dir, size: entry._data?.uncompressedSize,
    })));

    const manifestEntry = zip.file(MANIFEST_FILE);
    const databaseEntry = zip.file(DATABASE_FILE);

    if (!manifestEntry || !databaseEntry) {
        throw new Error(
            "La copia no contiene los archivos obligatorios."
        );
    }

    const manifest = JSON.parse(
        await manifestEntry.async("string")
    );

    validateBackupManifest(manifest);

    const dbBytes =
        await databaseEntry.async("uint8array");

    validateSQLiteSignature(dbBytes);

    return {
        uri,
        manifest,
        zip,
        size: info.size,
        databaseSize: dbBytes.length,
        fileCount: Object.values(zip.files)
            .filter(entry => !entry.dir).length,
    };
}

export async function prepareRestore(uri) {
    const inspection =
        await inspectRestoreFile(uri);

    // Nunca dejamos una preparación parcial.
    await removeDirectory(RESTORE_DIR);
    await ensureDirectory(RESTORE_DIR);

    try {
        const dbEntry =
            inspection.zip.file(DATABASE_FILE);

        const dbBase64 =
            await dbEntry.async("base64");

        await FileSystem.writeAsStringAsync(
            `${RESTORE_DIR}hotel_andale.db`,
            dbBase64,
            {
                encoding:
                    FileSystem.EncodingType.Base64,
            }
        );

        const hotelDirectory =
            `${RESTORE_DIR}hotel/`;

        await ensureDirectory(hotelDirectory);

        for (const [name, entry] of Object.entries(
            inspection.zip.files
        )) {
            if (
                entry.dir ||
                !name.startsWith("files/hotel/")
            ) {
                continue;
            }

            const relative =
                name.slice("files/hotel/".length);

            if (!relative) continue;

            const destination =
                `${hotelDirectory}${relative}`;

            const parent =
                destination.substring(
                    0,
                    destination.lastIndexOf("/") + 1
                );

            await ensureDirectory(parent);

            const content =
                await entry.async("base64");

            await FileSystem.writeAsStringAsync(
                destination,
                content,
                {
                    encoding:
                        FileSystem.EncodingType.Base64,
                }
            );
        }

        await FileSystem.writeAsStringAsync(
            STATE_FILE,
            JSON.stringify({
                status: "PENDING",
                createdAt:
                    new Date().toISOString(),
                manifest:
                    inspection.manifest,
            })
        );

        return inspection.manifest;
    } catch (error) {
        await removeDirectory(RESTORE_DIR);
        throw error;
    }
}

export async function hasPendingRestore() {
    const stateFile =
        `${FileSystem.documentDirectory}restore-pending/state.json`;

    const info =
        await FileSystem.getInfoAsync(stateFile);

    return info.exists;
}