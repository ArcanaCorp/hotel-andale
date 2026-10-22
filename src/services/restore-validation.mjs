export const RESTORE_LIMITS = Object.freeze({
    maxFiles: 5000,
    maxDatabaseBytes: 150 * 1024 * 1024,
    maxFileBytes: 25 * 1024 * 1024,
    maxTotalBytes: 500 * 1024 * 1024,
});

export function validateBackupEntries(entries) {
    let totalSize = 0;
    let count = 0;
    const names = new Set();
    for (const { name, size, dir = false } of entries) {
        if (dir) continue;
        count++;
        if (count > RESTORE_LIMITS.maxFiles) throw new Error("La copia contiene demasiados archivos.");
        if (!name || name.startsWith("/") || name.includes("\\") ||
            name.split("/").some(part => part === ".." || part === "." || part === "")) {
            throw new Error("La copia contiene rutas no permitidas.");
        }
        if (names.has(name)) throw new Error("La copia contiene archivos duplicados.");
        names.add(name);
        if (name !== "manifest.json" && name !== "database/hotel_andale.db" &&
            !name.startsWith("files/hotel/")) {
            throw new Error(`Archivo no reconocido: ${name}`);
        }
        if (!Number.isSafeInteger(size) || size < 0) throw new Error("No se pudo validar el tamaño de la copia.");
        if (size > (name === "database/hotel_andale.db" ?
            RESTORE_LIMITS.maxDatabaseBytes : RESTORE_LIMITS.maxFileBytes)) {
            throw new Error("Un archivo supera el límite permitido.");
        }
        totalSize += size;
        if (totalSize > RESTORE_LIMITS.maxTotalBytes) throw new Error("La copia descomprimida es demasiado grande.");
    }
    if (!names.has("manifest.json") || !names.has("database/hotel_andale.db")) {
        throw new Error("La copia no contiene los archivos obligatorios.");
    }
    return { count, totalSize };
}

export function validateBackupManifest(manifest) {
    if (!manifest || manifest.format !== "HOTEL_ANDALE_BACKUP" ||
        manifest.formatVersion !== 1 || manifest.databaseName !== "hotel_andale.db") {
        throw new Error("Este archivo no es una copia compatible de Hotel Ándale.");
    }
    return manifest;
}

export function validateSQLiteSignature(bytes) {
    const signature = [83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0];
    if (!bytes || bytes.length < 16 || signature.some((byte, i) => bytes[i] !== byte)) {
        throw new Error("La copia no contiene una base de datos SQLite válida.");
    }
    return true;
}
