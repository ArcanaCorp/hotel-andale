
const API_URL = "https://utilities.arcanacorp.dev";

export async function consultDni(dni) {
    const number = String(dni ?? "").trim();

    if (!/^\d{8}$/.test(number)) {
        throw new Error("El DNI debe contener 8 dígitos.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        12000
    );

    try {
        const response = await fetch(
            `${API_URL}/dni/${number}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                signal: controller.signal,
            }
        );

        const json = await response.json();

        if (!response.ok || json.success === false) {
            throw new Error(
                json.message ||
                "No se pudo consultar el DNI."
            );
        }

        const data = json.data ?? json;

        const firstName = String(
            data.nombres ??
            data.names ??
            data.first_name ??
            data.firstName ??
            ""
        ).trim();

        const paternal = String(
            data.apellidoPaterno ??
            data.apellido_paterno ??
            ""
        ).trim();

        const maternal = String(
            data.apellidoMaterno ??
            data.apellido_materno ??
            ""
        ).trim();

        const lastName = String(
            data.apellidos ??
            data.last_name ??
            data.lastName ??
            [paternal, maternal].filter(Boolean).join(" ")
        ).trim();

        if (!firstName || !lastName) {
            throw new Error(
                "La API respondió, pero no devolvió nombres y apellidos completos."
            );
        }

        return { firstName, lastName };
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "La consulta demoró demasiado. Inténtalo nuevamente."
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}