
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import {
    UsersRound,
    UserRound,
    UserCheck,
    BedDouble,
    Plus,
    Search,
    ChevronRight,
    CircleAlert,
    Phone,
    IdCard,
} from "lucide-react-native";

import TextField from "../../components/ui/TextField";
import ScreenTab from "../../components/ui/ScreenTab";
import Button from "../../components/ui/Button";
import { listGuests } from "../../services/guests.service";
import GuestCard from "../../components/GuestCard";

const C = {
    white: "#ffffff",
    black: "#18181b",
    gray: "#71717a",
    border: "#e4e4e7",
    light: "#f4f4f5",
    green: "#15803d",
    greenBg: "#f0fdf4",
};

const FILTERS = [
    { key: "ALL", label: "Todos" },
    { key: "ACTIVE", label: "Hospedados" },
    { key: "FREQUENT", label: "Frecuentes" },
];

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

export default function GuestsTab() {

    const router = useRouter()

    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const loadGuests = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await listGuests();
            setGuests(data);
        } catch (err) {
            setError(
                err?.message ||
                "No se pudieron cargar los huéspedes."
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
                    const data = await listGuests();

                    if (active) {
                        setGuests(data);
                    }
                } catch (err) {
                    if (active) {
                        setError(
                            err?.message ||
                            "No se pudieron cargar los huéspedes."
                        );
                    }
                } finally {
                    if (active) {
                        setLoading(false);
                    }
                }
            }

            load();

            return () => {
                active = false;
            };
        }, [])
    );

    const summary = useMemo(() => ({
        total: guests.length,

        active: guests.filter(
            guest => guest.active_stays > 0
        ).length,

        frequent: guests.filter(
            guest => guest.total_stays >= 3
        ).length,
    }), [guests]);

    const filteredGuests = useMemo(() => {
        const term = search.trim().toLowerCase();

        return guests.filter(guest => {
            const matchesFilter =
                filter === "ALL" ||
                (filter === "ACTIVE" &&
                    guest.active_stays > 0) ||
                (filter === "FREQUENT" &&
                    guest.total_stays >= 3);

            const fullName = [
                guest.first_name,
                guest.last_name,
            ].join(" ").toLowerCase();

            const document = String(
                guest.document_number || ""
            ).toLowerCase();

            const phone = String(
                guest.phone || ""
            ).toLowerCase();

            const matchesSearch =
                !term ||
                fullName.includes(term) ||
                document.includes(term) ||
                phone.includes(term);

            return matchesFilter && matchesSearch;
        });
    }, [guests, search, filter]);

    return (
        <ScreenTab>
            <View style={styles.header}>
                <View style={{ flex: 1, gap: 5 }}>
                    <TextField
                        label="Huéspedes"
                        size="3xl"
                        weight="bold"
                    />

                    <TextField
                        label="Administra los registros de tus clientes"
                        size="xs"
                        color="gray"
                    />
                </View>

                <Button
                    icon={Plus}
                    iconOnly
                    size="md"
                    accessibilityLabel="Agregar huésped"
                    onPress={() => router.push('/guests/new')}
                />
            </View>

            <View style={styles.summary}>
                <SummaryCard
                    label="Registrados"
                    value={summary.total}
                    Icon={UsersRound}
                />

                <SummaryCard
                    label="Hospedados"
                    value={summary.active}
                    Icon={BedDouble}
                />

                <SummaryCard
                    label="Frecuentes"
                    value={summary.frequent}
                    Icon={UserCheck}
                />
            </View>

            <View style={styles.searchBox}>
                <Search size={19} color={C.gray} />

                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar nombre, DNI o teléfono..."
                    placeholderTextColor="#a1a1aa"
                    style={styles.searchInput}
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.filters}>
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
                                    selected
                                        ? "semibold"
                                        : "medium"
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
            </View>

            <View style={styles.listHeader}>
                <TextField
                    label="Listado de huéspedes"
                    size="lg"
                    weight="semibold"
                />

                <TextField
                    label={`${filteredGuests.length} resultados`}
                    size="xs"
                    color="gray"
                />
            </View>

            {loading && guests.length === 0 ? (
                <View style={styles.empty}>
                    <ActivityIndicator
                        size="large"
                        color={C.black}
                    />

                    <TextField
                        label="Cargando huéspedes..."
                        size="sm"
                        color="gray"
                    />
                </View>
            ) : error ? (
                <View style={styles.empty}>
                    <CircleAlert
                        size={28}
                        color="#b91c1c"
                    />

                    <TextField
                        label="Error al cargar huéspedes"
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
                        onPress={loadGuests}
                    />
                </View>
            ) : filteredGuests.length === 0 ? (
                <View style={styles.empty}>
                    <UsersRound size={32} color={C.gray} />

                    <TextField
                        label={
                            guests.length === 0
                                ? "Aún no tienes huéspedes"
                                : "Sin resultados"
                        }
                        size="md"
                        weight="semibold"
                    />

                    <TextField
                        label={
                            guests.length === 0
                                ? "Los huéspedes registrados aparecerán aquí."
                                : "Prueba con otra búsqueda o filtro."
                        }
                        size="xs"
                        color="gray"
                        align="center"
                    />
                </View>
            ) : (
                <View style={styles.guestList}>
                    {filteredGuests.map(guest => (
                        <GuestCard key={guest.id} guest={guest} onPress={() => router.push({pathname: '/guests/[id]', params: {id: String(guest.id),}})} />
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
        flexWrap: "wrap",
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.white,
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
    guestList: {
        gap: 12,
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