import test from "node:test";
import assert from "node:assert/strict";
import { validateBackupEntries, validateBackupManifest, validateSQLiteSignature, RESTORE_LIMITS } from "../src/services/restore-validation.mjs";

const valid = [
    { name: "manifest.json", size: 200 },
    { name: "database/hotel_andale.db", size: 4096 },
    { name: "files/hotel/logo.png", size: 300 },
];
test("respaldo válido con base y archivos del hotel", () => {
    assert.deepEqual(validateBackupEntries(valid), { count: 3, totalSize: 4596 });
    assert.equal(validateBackupManifest({ format: "HOTEL_ANDALE_BACKUP", formatVersion: 1, databaseName: "hotel_andale.db" }).formatVersion, 1);
    assert.equal(validateSQLiteSignature(Uint8Array.from([83,81,76,105,116,101,32,102,111,114,109,97,116,32,51,0])), true);
});
test("rechaza archivos obligatorios ausentes", () => {
    for (const name of ["manifest.json", "database/hotel_andale.db"]) {
        assert.throws(() => validateBackupEntries(valid.filter(x => x.name !== name)));
    }
});
test("rechaza rutas de escape y archivos ajenos", () => {
    for (const name of ["../evil.txt", "/absolute", "files/hotel/../evil", "files/hotel//logo.png", "files\\hotel\\evil", "files/hotel/./evil", "unexpected.txt"]) {
        assert.throws(() => validateBackupEntries([...valid, { name, size: 2 }]), name);
    }
});
test("rechaza tamaños falsos y límites de descompresión", () => {
    for (const size of [-1, NaN, 1.5, null, RESTORE_LIMITS.maxDatabaseBytes + 1]) {
        assert.throws(() => validateBackupEntries(valid.map(x => x.name.startsWith("database/") ? { ...x, size } : x)));
    }
    assert.throws(() => validateBackupEntries([...valid, { name: "files/hotel/huge.bin", size: RESTORE_LIMITS.maxFileBytes + 1 }]));
});
test("rechaza formato y firma SQLite incorrectos", () => {
    for (const manifest of [null, {}, { format: "OTHER", formatVersion: 1, databaseName: "hotel_andale.db" }, { format: "HOTEL_ANDALE_BACKUP", formatVersion: 2, databaseName: "hotel_andale.db" }]) {
        assert.throws(() => validateBackupManifest(manifest));
    }
    assert.throws(() => validateSQLiteSignature(Uint8Array.from([1,2,3])));
});
