export const formatDate = (value) => {
    if (!value) return "Sin fecha";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Fecha inválida";
    }

    return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const formatMoney = (cents, currency) => {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
    }).format((cents ?? 0) / 100);
}