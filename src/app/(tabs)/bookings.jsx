
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import {
    CalendarDays,
    CalendarCheck,
    Clock3,
    Search,
    Plus,
    BedDouble,
    ChevronRight,
    CircleAlert,
    CheckCircle2,
    XCircle,
    UserRound,
} from "lucide-react-native";

import TextField from "../../components/ui/TextField";
import ScreenTab from "../../components/ui/ScreenTab";
import Button from "../../components/ui/Button";
import { useProfile } from "../../context/ProfileContext";
import { listBookings } from "../../services/bookings.service";

const C = {
    white: "#ffffff",
    black: "#18181b",
    gray: "#71717a",
    border: "#e4e4e7",
    light: "#f4f4f5",
    green: "#15803d",
    greenBg: "#f0fdf4",
    orange: "#c2410c",
    orangeBg: "#fff7ed",
    blue: "#1d4ed8",
    blueBg: "#eff6ff",
    red: "#b91c1c",
    redBg: "#fef2f2",
};

const STATUS = {
    PENDING: {
        label: "Pendiente",
        color: C.orange,
        background: C.orangeBg,
    },
    CONFIRMED: {
        label: "Confirmada",
        color: C.green,
        background: C.greenBg,
    },
    CHECKED_IN: {
        label: "Check-in realizado",
        color: C.blue,
        background: C.blueBg,
    },
    CANCELLED: {
        label: "Cancelada",
        color: C.red,
        background: C.redBg,
    },
    NO_SHOW: {
        label: "No se presentó",
        color: C.gray,
        background: C.light,
    },
};

const FILTERS = [
    { key: "ALL", label: "Todas" },
    { key: "PENDING", label: "Pendientes" },
    { key: "CONFIRMED", label: "Confirmadas" },
    { key: "CHECKED_IN", label: "Check-in" },
    { key: "CANCELLED", label: "Canceladas" },
    { key: "NO_SHOW", label: "No presentados" },
];

function formatDate(value) {
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

function formatMoney(cents, currency) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
    }).format((cents ?? 0) / 100);
}

function SummaryCard({ label, value, Icon }) {
    return (
        <View style={styles.summaryCard}>
            <Icon size={19} color={C.gray} />

            <TextField
                label={String(value)}
                size="2xl"
                weight="bold"
            />

            <TextField
                label={label}
                size="xs"
                color="gray"
            />
        </View>
    );
}

function BookingCard({ booking, currency, onPress }) {
    const status = STATUS[booking.status] || {
        label: booking.status,
        color: C.gray,
        background: C.light,
    };

    const guestName = [
        booking.first_name,
        booking.last_name,
    ].filter(Boolean).join(" ");

    const balanceCents =
        booking.agreed_price_cents - booking.paid_cents;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.bookingCard,
                pressed && { opacity: 0.75 },
            ]}
        >
            <View style={styles.bookingTop}>
                <View style={styles.bookingIcon}>
                    <CalendarDays size={22} color={C.black} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                    <TextField
                        label={`Reserva #${booking.id}`}
                        size="md"
                        weight="semibold"
                    />

                    <TextField
                        label={`Habitación ${booking.room_number} · ${booking.room_type}`}
                        size="xs"
                        color="gray"
                    />
                </View>

                <ChevronRight size={19} color={C.gray} />
            </View>

            <View style={styles.guestRow}>
                <UserRound size={16} color={C.gray} />

                <TextField
                    label={guestName || "Huésped sin nombre"}
                    size="sm"
                    weight="medium"
                />
            </View>

            <View style={styles.dateBox}>
                <View style={styles.dateColumn}>
                    <TextField
                        label="Entrada"
                        size="xs"
                        color="gray"
                    />

                    <TextField
                        label={formatDate(booking.start_at)}
                        size="xs"
                        weight="medium"
                    />
                </View>

                <View style={styles.dateColumn}>
                    <TextField
                        label="Salida"
                        size="xs"
                        color="gray"
                    />

                    <TextField
                        label={formatDate(booking.end_at)}
                        size="xs"
                        weight="medium"
                    />
                </View>
            </View>

            <View style={styles.bookingFooter}>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: status.background },
                    ]}
                >
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: status.color },
                        ]}
                    />

                    <TextField
                        label={status.label}
                        size="xs"
                        weight="medium"
                        style={{ color: status.color }}
                    />
                </View>

                <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <TextField
                        label={formatMoney(
                            booking.agreed_price_cents,
                            currency
                        )}
                        size="sm"
                        weight="semibold"
                    />

                    <TextField
                        label={
                            balanceCents > 0
                                ? `Saldo: ${formatMoney(balanceCents, currency)}`
                                : balanceCents === 0
                                    ? "Sin saldo pendiente"
                                    : `Saldo a favor: ${formatMoney(-balanceCents, currency)}`
                        }
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>
        </Pressable>
    );
}

export default function BookingsTab() {

    const router = useRouter();

    const { profile } = useProfile();

    const currency = profile?.currency || "PEN";

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const loadBookings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await listBookings();
            setBookings(data);
        } catch (err) {
            setError(
                err?.message ||
                "No se pudieron cargar las reservas."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                setLoading(true);
                setError(null);

                try {
                    const data = await listBookings();

                    if (active) setBookings(data);
                } catch (err) {
                    if (active) {
                        setError(
                            err?.message ||
                            "No se pudieron cargar las reservas."
                        );
                    }
                } finally {
                    if (active) setLoading(false);
                }
            }

            load();

            return () => {
                active = false;
            };
        }, [])
    );

    const summary = useMemo(() => ({
        total: bookings.length,
        pending: bookings.filter(
            b => b.status === "PENDING"
        ).length,
        confirmed: bookings.filter(
            b => b.status === "CONFIRMED"
        ).length,
    }), [bookings]);

    const filteredBookings = useMemo(() => {
        const term = search.trim().toLowerCase();

        return bookings.filter(booking => {
            const matchesStatus =
                filter === "ALL" ||
                booking.status === filter;

            const guestName = [
                booking.first_name,
                booking.last_name,
            ].join(" ").toLowerCase();

            const matchesSearch =
                !term ||
                String(booking.id).includes(term) ||
                String(booking.room_number)
                    .toLowerCase()
                    .includes(term) ||
                guestName.includes(term) ||
                String(booking.document_number || "")
                    .toLowerCase()
                    .includes(term);

            return matchesStatus && matchesSearch;
        });
    }, [bookings, search, filter]);

    return (
        <ScreenTab>
            <View style={styles.header}>
                <View style={{ flex: 1, gap: 5 }}>
                    <TextField label="Reservas" size="3xl" weight="bold" />
                    <TextField label="Organiza las próximas estadías" size="xs" color="gray" />
                </View>
                <Button icon={Plus} iconOnly size="md" accessibilityLabel="Nueva reserva" onPress={() => router.push('/booking/new')} />
            </View>

            <View style={styles.summary}>
                <SummaryCard
                    label="Total"
                    value={summary.total}
                    Icon={CalendarDays}
                />

                <SummaryCard
                    label="Pendientes"
                    value={summary.pending}
                    Icon={Clock3}
                />

                <SummaryCard
                    label="Confirmadas"
                    value={summary.confirmed}
                    Icon={CalendarCheck}
                />
            </View>

            <View style={styles.searchBox}>
                <Search size={19} color={C.gray} />

                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar reserva, huésped o habitación..."
                    placeholderTextColor="#a1a1aa"
                    style={styles.searchInput}
                    autoCapitalize="none"
                />
            </View>

            <ScrollView style={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
                {FILTERS.map(item => {
                    const selected = filter === item.key;

                    return (
                        <Pressable
                            key={item.key}
                            onPress={() => setFilter(item.key)}
                            style={[
                                styles.filterChip,
                                selected && styles.filterActive,
                            ]}
                        >
                            <TextField
                                label={item.label}
                                size="xs"
                                weight={
                                    selected ? "semibold" : "medium"
                                }
                                style={{
                                    color: selected
                                        ? C.white
                                        : C.gray,
                                }}
                            />
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.listHeader}>
                <TextField
                    label="Listado de reservas"
                    size="lg"
                    weight="semibold"
                />

                <TextField
                    label={`${filteredBookings.length} resultados`}
                    size="xs"
                    color="gray"
                />
            </View>

            {loading && bookings.length === 0 ? (
                <View style={styles.empty}>
                    <ActivityIndicator
                        size="large"
                        color={C.black}
                    />

                    <TextField
                        label="Cargando reservas..."
                        size="sm"
                        color="gray"
                    />
                </View>
            ) : error ? (
                <View style={styles.empty}>
                    <CircleAlert size={28} color={C.red} />

                    <TextField
                        label="Error al cargar reservas"
                        size="sm"
                        weight="semibold"
                    />

                    <TextField
                        label={error}
                        size="xs"
                        color="gray"
                        align="center"
                    />

                    <Button
                        text="Reintentar"
                        variant="secondary"
                        fullWidth={false}
                        onPress={loadBookings}
                    />
                </View>
            ) : filteredBookings.length === 0 ? (
                <View style={styles.empty}>
                    <CalendarDays size={32} color={C.gray} />

                    <TextField
                        label={
                            bookings.length === 0
                                ? "Aún no tienes reservas"
                                : "Sin resultados"
                        }
                        size="md"
                        weight="semibold"
                    />

                    <TextField
                        label={
                            bookings.length === 0
                                ? "Las reservas que registres aparecerán aquí."
                                : "Prueba con otra búsqueda o estado."
                        }
                        size="xs"
                        color="gray"
                        align="center"
                    />
                </View>
            ) : (
                <View style={styles.bookingList}>
                    {filteredBookings.map(booking => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            currency={currency}
                            onPress={() => router.push({ pathname: "/booking/confirmation", params: { id: String(booking.id) }})}
                        />
                    ))}
                </View>
            )}
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    summary: {
        flexDirection: "row",
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 12,
        gap: 7,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 52,
    },
    searchInput: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: C.black,
        paddingVertical: 10,
    },
    filters: {
        flexDirection: "row",
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.white,
        marginRight: 8
    },
    filterActive: {
        backgroundColor: C.black,
        borderColor: C.black,
    },
    listHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    bookingList: {
        gap: 12,
    },
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
    empty: {
        padding: 30,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        alignItems: "center",
        gap: 12,
    },
});