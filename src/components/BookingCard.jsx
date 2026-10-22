import { Pressable, StyleSheet, View } from "react-native";
import { STATUS } from "../constants/rooms";
import { tokens } from "../styles/tokens";
import { CalendarDays, ChevronRight, UserRound } from "lucide-react-native";
import TextField from "./ui/TextField";
import { formatDate, formatMoney } from "../utils/format";
import { STATUS_BOOKING } from "../constants/booking";

const C = tokens.colors;

export default function BookingCard({ booking, currency, onPress }) {

    const status = STATUS_BOOKING[booking.status] || {
        label: booking.status,
        color: C.gray,
        background: C.light,
    };

    const guestName = [booking.first_name, booking.last_name].filter(Boolean).join(" ");

    const balanceCents = booking.agreed_price_cents - booking.paid_cents;
    const payment_status = balanceCents > 0 ? `Saldo: ${formatMoney(balanceCents, currency)}` : balanceCents === 0 ? "Sin saldo pendiente" : `Saldo a favor: ${formatMoney(-balanceCents, currency)}`

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.bookingCard, pressed && { opacity: 0.75 }]}>
            <View style={styles.bookingTop}>
                <View style={styles.bookingIcon}>
                    <CalendarDays size={22} color={C.black} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                    <TextField label={`Reserva #${booking.id}`} size="md" weight="semibold" />
                    <TextField label={`Habitación ${booking.room_number} · ${booking.room_type}`} size="xs" color="gray" />
                </View>

                <ChevronRight size={19} color={C.gray} />
            </View>

            <View style={styles.guestRow}>
                <UserRound size={16} color={C.gray} />
                <TextField label={guestName || "Huésped sin nombre"} size="sm" weight="medium" />
            </View>

            <View style={styles.dateBox}>
                <View style={styles.dateColumn}>
                    <TextField label="Entrada" size="xs" color="gray" />
                    <TextField label={formatDate(booking.start_at)} size="xs" weight="medium" />
                </View>
                <View style={styles.dateColumn}>
                    <TextField label="Salida" size="xs" color="gray" />
                    <TextField label={formatDate(booking.end_at)} size="xs" weight="medium" />
                </View>
            </View>

            <View style={styles.bookingFooter}>
                <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]}/>
                    <TextField label={status.label} size="xs" weight="medium" style={{ color: status.color }} />
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <TextField label={formatMoney(booking.agreed_price_cents, currency)} size="sm" weight="semibold" />
                    <TextField label={payment_status} size="xs" color="gray" />
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    bookingCard: {
        padding: 15,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        gap: 14,
    },
    bookingTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    bookingIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    guestRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateBox: {
        flexDirection: "row",
        gap: 12,
        padding: 12,
        backgroundColor: C.light,
        borderRadius: 12,
    },
    dateColumn: {
        flex: 1,
        gap: 5,
    },
    bookingFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
})