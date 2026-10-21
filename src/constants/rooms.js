import { tokens } from "../styles/tokens";

export const STATUS = {
    AVAILABLE: {
        label: "Disponible",
        color: tokens.colors.green,
        background: tokens.colors.greenBg,
    },
    OCCUPIED: {
        label: "Ocupada",
        color: tokens.colors.orange,
        background: tokens.colors.orangeBg,
    },
    CLEANING: {
        label: "En limpieza",
        color: tokens.colors.blue,
        background: tokens.colors.blueBg,
    },
    MAINTENANCE: {
        label: "Mantenimiento",
        color: tokens.colors.red,
        background: tokens.colors.redBg,
    },
};

export const FILTERS = [
    { key: "ALL", label: "Todas" },
    { key: "AVAILABLE", label: "Disponibles" },
    { key: "OCCUPIED", label: "Ocupadas" },
    { key: "CLEANING", label: "Limpieza" },
    { key: "MAINTENANCE", label: "Mantenimiento" },
];