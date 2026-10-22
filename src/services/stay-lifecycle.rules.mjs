/**
 * Reglas puras del ciclo de vida de una habitación.
 * No dependen de SQLite ni de React Native.
 */
export function canCheckIn({ reservationStatus, roomStatus, roomActive, existingStay }) {
    return ["PENDING", "CONFIRMED"].includes(reservationStatus)
        && roomActive === true
        && roomStatus === "AVAILABLE"
        && !existingStay;
}

export function canCheckOut({ stayStatus, roomStatus, balanceCents }) {
    return stayStatus === "ACTIVE"
        && roomStatus === "OCCUPIED"
        && Number.isSafeInteger(balanceCents)
        && balanceCents <= 0;
}

export function canMarkRoomClean({ roomStatus, roomActive, activeStay }) {
    return roomStatus === "CLEANING" && roomActive === true && !activeStay;
}
