
import { findGuestByIdentity } from "./guests.service";
import { consultDni } from "./dni.service";

export async function lookupGuest(documentType, documentNumber) {
    const type = String(documentType ?? "").trim();
    const number = String(documentNumber ?? "").trim();

    if (!type || !number) {
        throw new Error("Ingresa el documento de identidad.");
    }

    if (type === "DNI" && !/^\d{8}$/.test(number)) {
        throw new Error("El DNI debe contener 8 dígitos.");
    }

    // 1. PRIORIDAD: SQLite local.
    const localGuest = await findGuestByIdentity(
        type,
        number
    );

    if (localGuest) {
        return {
            source: "LOCAL",
            guestId: localGuest.id,
            firstName: localGuest.first_name,
            lastName: localGuest.last_name,
            nationality:
                type === "DNI"
                    ? "Peruana"
                    : localGuest.nationality || "",
            phone: localGuest.phone || "",
        };
    }

    // 2. Si no está registrado y es DNI,
    // consultar el servicio externo.
    if (type === "DNI") {
        const person = await consultDni(number);

        return {
            source: "API",
            guestId: null,
            firstName: person.firstName,
            lastName: person.lastName,
            nationality: "Peruana",
            phone: "",
        };
    }

    // 3. Documento extranjero no encontrado.
    return {
        source: "NEW",
        guestId: null,
        firstName: "",
        lastName: "",
        nationality: "",
        phone: "",
    };
}