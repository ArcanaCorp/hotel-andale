import { tokens } from "../styles/tokens";

export const STATUS_BOOKING = {
    PENDING: {
        label: "Pendiente",
        color: tokens.colors.orange,
        background: tokens.colors.orangeBg,
    },
    CONFIRMED: {
        label: "Confirmada",
        color: tokens.colors.green,
        background: tokens.colors.greenBg,
    },
    CHECKED_IN: {
        label: "Check-in realizado",
        color: tokens.colors.blue,
        background: tokens.colors.blueBg,
    },
    CHECKED_OUT: {
        label: "Check-out realizado",
    },
    CANCELLED: {
        label: "Cancelada",
        color: tokens.colors.red,
        background: tokens.colors.redBg,
    },
    NO_SHOW: {
        label: "No se presentó",
        color: tokens.colors.gray,
        background: tokens.colors.light,
    },
};

export const FILTERS_BOOKING = [
    { key: "ALL", label: "Todas" },
    { key: "PENDING", label: "Pendientes" },
    { key: "CONFIRMED", label: "Confirmadas" },
    { key: "CHECKED_IN", label: "Check-in" },
    { key: "CANCELLED", label: "Canceladas" },
    { key: "NO_SHOW", label: "No presentados" },
];