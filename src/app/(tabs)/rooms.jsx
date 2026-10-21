import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BedDouble, CircleAlert, DoorClosed, Plus, Search, Sparkles } from "lucide-react-native";
import TextField from "../../components/ui/TextField";
import ScreenTab from "../../components/ui/ScreenTab";
import Button from "../../components/ui/Button";
import { listRooms } from "../../services/rooms.service";
import RoomCard from "../../components/RoomCard";
import { FILTERS } from "../../constants/rooms";

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

function SummaryCard({ value, label, Icon }) {
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

export default function RoomsTab() {
    const router = useRouter();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const loadRooms = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await listRooms();
            setRooms(data);
        } catch (err) {
            setError(
                err?.message ||
                "No se pudieron cargar las habitaciones."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadRooms();
        }, [loadRooms])
    );

    const summary = useMemo(() => ({
        total: rooms.length,
        available: rooms.filter(
            r => r.operational_status === "AVAILABLE"
        ).length,
        occupied: rooms.filter(
            r => r.operational_status === "OCCUPIED"
        ).length,
    }), [rooms]);

    const filteredRooms = useMemo(() => {
        const term = search.trim().toLowerCase();

        return rooms.filter(room => {
            const matchesStatus =
                filter === "ALL" ||
                room.operational_status === filter;

            const matchesSearch =
                !term ||
                String(room.number).toLowerCase().includes(term) ||
                String(room.room_type || "")
                    .toLowerCase()
                    .includes(term);

            return matchesStatus && matchesSearch;
        });
    }, [rooms, search, filter]);

    return (
        <ScreenTab>
            <View style={styles.header}>
                <View style={{ flex: 1, gap: 5 }}>
                    <TextField label="Habitaciones" size="3xl" weight="bold" />
                    <TextField label="Administra tus espacios y disponibilidad" size="xs" color="gray" />
                </View>
                <Button icon={Plus} iconOnly size="md" accessibilityLabel="Agregar habitación" onPress={() => router.push("/rooms/new")}/>
            </View>

            <View style={styles.summary}>
                <SummaryCard label="Total" value={summary.total} Icon={BedDouble}/>
                <SummaryCard label="Disponibles" value={summary.available} Icon={Sparkles}/>
                <SummaryCard label="Ocupadas" value={summary.occupied} Icon={DoorClosed}/>
            </View>

            <View style={styles.searchBox}>
                <Search size={19} color={C.gray} />

                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar por número o tipo..."
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
                <TextField label="Listado de habitaciones" size="lg" weight="semibold" />
                <TextField label={`${filteredRooms.length} resultados`} size="xs" color="gray" />
            </View>

            {loading && rooms.length === 0 ? (
                <View style={styles.empty}>
                    <ActivityIndicator size="large" color={C.black} />
                    <TextField label="Cargando habitaciones..." size="sm" color="gray" />
                </View>
            ) : error ? (
                <View style={styles.empty}>
                    <CircleAlert size={28} color={C.red} />
                    <TextField label="Error al cargar habitaciones" size="sm" weight="semibold" />
                    <TextField label={error} size="xs" color="gray" align="center" />
                    <Button text="Reintentar" variant="secondary" fullWidth={false} onPress={loadRooms} />
                </View>
            ) : filteredRooms.length === 0 ? (
                <View style={styles.empty}>
                    <BedDouble size={32} color={C.gray} />

                    <TextField
                        label={
                            rooms.length === 0
                                ? "Aún no tienes habitaciones"
                                : "Sin resultados"
                        }
                        size="md"
                        weight="semibold"
                    />

                    <TextField
                        label={
                            rooms.length === 0
                                ? "Registra las habitaciones de tu establecimiento para comenzar."
                                : "Prueba con otro número, tipo o estado."
                        }
                        size="xs"
                        color="gray"
                        align="center"
                    />
                </View>
            ) : (
                <View style={styles.roomList}>
                    {filteredRooms.map(room => (
                        <RoomCard key={room.id} room={room} onPress={() => router.push({pathname: '/rooms/[id]', params: { id: String(room.id) }})}/>
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
    roomList: {
        gap: 12,
    },
    roomCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 15,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
    },
    roomIcon: {
        width: 52,
        height: 52,
        borderRadius: 13,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    roomInfo: {
        flex: 1,
        gap: 5,
    },
    statusBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 5,
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
