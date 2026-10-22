import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import { CalendarDays, CalendarCheck, Clock3, Search, Plus, CircleAlert } from "lucide-react-native";

import TextField from "../../components/ui/TextField";
import ScreenTab from "../../components/ui/ScreenTab";
import Button from "../../components/ui/Button";
import { useProfile } from "../../context/ProfileContext";
import { listBookings } from "../../services/bookings.service";
import BookingCard from "../../components/BookingCard";
import { tokens } from "../../styles/tokens";
import SummaryCard from "../../components/SummaryCardBook";
import FilterChip from "../../components/ui/FilterChip";
import EmptyCard from "../../components/(bookings)/EmptyCard";
import { FILTERS_BOOKING } from "../../constants/booking";

const C = tokens.colors;

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
                <SummaryCard label="Total" value={summary.total} Icon={CalendarDays} />
                <SummaryCard label="Pendientes" value={summary.pending} Icon={Clock3} />
                <SummaryCard label="Confirmadas" value={summary.confirmed} Icon={CalendarCheck} />
            </View>

            <View style={styles.searchBox}>
                <Search size={19} color={C.gray} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Buscar reserva, huésped o habitación..." placeholderTextColor="#a1a1aa" style={styles.searchInput} autoCapitalize="none"/>
            </View>

            <ScrollView style={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
                {FILTERS_BOOKING.map(item => {
                    const selected = filter === item.key;
                    return (
                        <FilterChip key={item.key} item={item} selected={selected} setFilter={setFilter} />
                    );
                })}
            </ScrollView>

            <View style={styles.listHeader}>
                <TextField label="Listado de reservas" size="lg" weight="semibold"/>
                <TextField label={`${filteredBookings.length} resultados`} size="xs" color="gray"/>
            </View>

            {loading && bookings.length === 0 ? (
                <View style={styles.empty}>
                    <ActivityIndicator size="large" color={C.black}/>
                    <TextField label="Cargando reservas..." size="sm" color="gray"/>
                </View>
            ) : error ? (
                <View style={styles.empty}>
                    <CircleAlert size={28} color={C.red} />
                    <TextField label="Error al cargar reservas" size="sm" weight="semibold" />
                    <TextField label={error} size="xs" color="gray" align="center" />
                    <Button text="Reintentar" variant="secondary" fullWidth={false} onPress={loadBookings} />
                </View>
            ) : filteredBookings.length === 0 ? (
                <EmptyCard bookings={bookings} />
            ) : (
                <View style={styles.bookingList}>
                    {filteredBookings.map(booking => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            currency={currency}
                            onPress={() => router.push({ pathname: "/booking/details", params: { id: String(booking.id) }})}
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
    listHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    bookingList: {
        gap: 12,
    }
});