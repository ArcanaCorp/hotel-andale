
import { getDatabase } from "../database";

export async function getLicenseInfo() {
    const db = await getDatabase();

    const columns = await db.getAllAsync(
        "PRAGMA table_info(licenses)"
    );

    return {
        configured: columns.length > 0,
        status: "UNVERIFIED",
        plan: null,
        expiresAt: null,
        activatedAt: null,
        deviceId: null,
    };
}

export async function activateLicense(code) {
    const normalized = String(code || "")
        .trim()
        .toUpperCase();

    if (!normalized) {
        throw new Error(
            "Introduce tu código de activación."
        );
    }

    // Pendiente: conectar al validador de
    // licencias existente de Hotel Ándale.
    //
    // No se debe marcar una licencia como activa
    // únicamente porque se haya ingresado
    // un código con formato válido.

    throw new Error(
        "El validador de licencias todavía no está conectado."
    );
}
