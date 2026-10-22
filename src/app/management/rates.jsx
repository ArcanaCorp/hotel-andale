
import { useCallback, useMemo, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from "react-native";

import {
    useFocusEffect,
    useRouter,
} from "expo-router";

import {
    ArrowLeft,
    BedDouble,
    ChevronRight,
    Clock3,
    Moon,
    Search,
    Tags,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    listRoomRates,
    saveRoomRates,
} from "../../database/repositories/rates.repository";

const C = tokens.colors;

const money = cents =>
    `S/ ${(Number(cents || 0) / 100).toFixed(2)}`;

function parseMoney(value) {
    const normalized = String(value)
        .trim()
        .replace(",", ".");

    if (
        !/^\d+(\.\d{1,2})?$/.test(normalized)
    ) {
        return null;
    }

    const [whole, fraction = ""] =
        normalized.split(".");

    const cents =
        Number(whole) * 100 +
        Number(fraction.padEnd(2, "0"));

    return Number.isSafeInteger(cents)
        ? cents
        : null;
}

function PriceBox({ label, price, active, icon: Icon }) {
    return (
        <View style={styles.priceBox}>
            <View style={styles.priceLabel}>
                <Icon
                    size={15}
                    color={C.gray}
                />

                <TextField
                    label={label}
                    size="xs"
                    color="gray"
                />
            </View>

            <TextField
                label={
                    price == null
                        ? "Sin tarifa"
                        : money(price)
                }
                size="md"
                weight="bold"
            />

            <TextField
                label={
                    price == null
                        ? "Pendiente"
                        : active
                            ? "Activa"
                            : "Inactiva"
                }
                size="xs"
                color="gray"
            />
        </View>
    );
}

function RateInput({
    label,
    icon: Icon,
    enabled,
    onEnabledChange,
    value,
    onValueChange,
}) {
    return (
        <View style={styles.rateEditor}>
            <View style={styles.between}>
                <View style={styles.row}>
                    <Icon
                        size={19}
                        color={C.primary}
                    />

                    <TextField
                        label={label}
                        size="md"
                        weight="semibold"
                    />
                </View>

                <Switch
                    value={enabled}
                    onValueChange={onEnabledChange}
                    trackColor={{
                        true: C.primary,
                    }}
                />
            </View>

            <TextField
                label="Precio en soles"
                size="sm"
                color="gray"
            />

            <TextInput
                value={value}
                onChangeText={onValueChange}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={enabled}
                style={[
                    styles.input,
                    !enabled && styles.disabledInput,
                ]}
            />
        </View>
    );
}

export default function RatesScreen() {
    const router = useRouter();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const [selectedRoom, setSelectedRoom] =
        useState(null);

    const [form, setForm] = useState({
        hourlyEnabled: false,
        hourlyPrice: "",
        nightlyEnabled: false,
        nightlyPrice: "",
    });

    const load = useCallback(async () => {
        try {
            const data = await listRoomRates();
            setRooms(data);
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudieron cargar las tarifas."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const filteredRooms = useMemo(() => {
        const query = search.trim().toLowerCase();

        return rooms.filter(room =>
            `${room.number} ${room.room_type_name}`
                .toLowerCase()
                .includes(query)
        );
    }, [rooms, search]);

    const configuredCount = rooms.filter(room =>
        room.hourly_rate_id != null ||
        room.nightly_rate_id != null
    ).length;

    const openEditor = room => {
        setSelectedRoom(room);

        setForm({
            hourlyEnabled:
                room.hourly_active === 1,
            hourlyPrice:
                room.hourly_price_cents == null
                    ? ""
                    : (
                        room.hourly_price_cents / 100
                    ).toFixed(2),

            nightlyEnabled:
                room.nightly_active === 1,
            nightlyPrice:
                room.nightly_price_cents == null
                    ? ""
                    : (
                        room.nightly_price_cents / 100
                    ).toFixed(2),
        });
    };

    const updateForm = (key, value) => {
        setForm(previous => ({
            ...previous,
            [key]: value,
        }));
    };

    const handleSave = async () => {
        if (!selectedRoom || saving) return;

        const hourly = parseMoney(
            form.hourlyPrice
        );

        const nightly = parseMoney(
            form.nightlyPrice
        );

        if (form.hourlyEnabled && hourly === null) {
            Alert.alert(
                "Precio inválido",
                "Ingresa un precio por hora válido."
            );
            return;
        }

        if (form.nightlyEnabled && nightly === null) {
            Alert.alert(
                "Precio inválido",
                "Ingresa un precio por noche válido."
            );
            return;
        }

        if (
            !form.hourlyEnabled &&
            !form.nightlyEnabled
        ) {
            Alert.alert(
                "Sin tarifas activas",
                "Debes activar al menos una modalidad."
            );
            return;
        }

        setSaving(true);

        try {
            const rates = [
                {
                    billing_mode: "HOURLY",
                    price_cents: hourly ?? 0,
                    is_active:
                        form.hourlyEnabled ? 1 : 0,
                },
                {
                    billing_mode: "NIGHTLY",
                    price_cents: nightly ?? 0,
                    is_active:
                        form.nightlyEnabled ? 1 : 0,
                },
            ];

            await saveRoomRates(
                selectedRoom.id,
                rates
            );

            setSelectedRoom(null);
            await load();
        } catch (error) {
            Alert.alert(
                "No se pudo guardar",
                error?.message ||
                    "Ocurrió un error."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScreenTab>
            <View style={styles.header}>
                <Button
                    icon={ArrowLeft}
                    iconOnly
                    variant="ghost"
                    onPress={() => router.back()}
                />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="Tarifas y precios"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Precios de hospedaje"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.metrics}>
                <View style={styles.metric}>
                    <TextField
                        label="Habitaciones"
                        size="xs"
                        color="gray"
                    />
                    <TextField
                        label={String(rooms.length)}
                        size="lg"
                        weight="bold"
                    />
                </View>

                <View style={styles.metric}>
                    <TextField
                        label="Configuradas"
                        size="xs"
                        color="gray"
                    />
                    <TextField
                        label={String(configuredCount)}
                        size="lg"
                        weight="bold"
                    />
                </View>

                <View style={styles.metric}>
                    <TextField
                        label="Pendientes"
                        size="xs"
                        color="gray"
                    />
                    <TextField
                        label={String(
                            rooms.length - configuredCount
                        )}
                        size="lg"
                        weight="bold"
                    />
                </View>
            </View>

            <View style={styles.searchBox}>
                <Search
                    size={19}
                    color={C.gray}
                />

                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar habitación..."
                    style={styles.searchInput}
                />
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator
                        color={C.primary}
                        size="large"
                    />
                </View>
            ) : filteredRooms.length === 0 ? (
                <View style={styles.empty}>
                    <Tags
                        size={32}
                        color={C.gray}
                    />

                    <TextField
                        label="No hay habitaciones para mostrar."
                        size="sm"
                        color="gray"
                    />
                </View>
            ) : (
                filteredRooms.map(room => {
                    const configured =
                        room.hourly_rate_id != null ||
                        room.nightly_rate_id != null;

                    return (
                        <Pressable
                            key={room.id}
                            style={styles.roomCard}
                            onPress={() =>
                                openEditor(room)
                            }
                        >
                            <View style={styles.between}>
                                <View style={{ gap: 5 }}>
                                    <TextField
                                        label={
                                            `Habitación ${room.number}`
                                        }
                                        size="md"
                                        weight="bold"
                                    />

                                    <TextField
                                        label={
                                            room.room_type_name +
                                            (room.floor
                                                ? ` · Piso ${room.floor}`
                                                : "")
                                        }
                                        size="xs"
                                        color="gray"
                                    />
                                </View>

                                <ChevronRight
                                    size={20}
                                    color={C.gray}
                                />
                            </View>

                            <View style={styles.priceGrid}>
                                <PriceBox
                                    label="Por hora"
                                    icon={Clock3}
                                    price={
                                        room.hourly_price_cents
                                    }
                                    active={
                                        room.hourly_active === 1
                                    }
                                />

                                <PriceBox
                                    label="Por noche"
                                    icon={Moon}
                                    price={
                                        room.nightly_price_cents
                                    }
                                    active={
                                        room.nightly_active === 1
                                    }
                                />
                            </View>

                            <TextField
                                label={
                                    configured
                                        ? "Editar tarifas"
                                        : "Configurar tarifas"
                                }
                                size="sm"
                                color="primary"
                                weight="medium"
                            />
                        </Pressable>
                    );
                })
            )}

            <BottomSheet
                visible={!!selectedRoom}
                title={
                    selectedRoom
                        ? `Tarifas · Habitación ${selectedRoom.number}`
                        : "Tarifas"
                }
                busy={saving}
                onClose={() => {
                    if (!saving) {
                        setSelectedRoom(null);
                    }
                }}
            >
                <View style={styles.sheet}>
                    <TextField
                        label={
                            selectedRoom?.room_type_name ||
                            ""
                        }
                        size="sm"
                        color="gray"
                    />

                    <RateInput
                        label="Tarifa por hora"
                        icon={Clock3}
                        enabled={form.hourlyEnabled}
                        onEnabledChange={value =>
                            updateForm(
                                "hourlyEnabled",
                                value
                            )
                        }
                        value={form.hourlyPrice}
                        onValueChange={value =>
                            updateForm(
                                "hourlyPrice",
                                value
                            )
                        }
                    />

                    <RateInput
                        label="Tarifa por noche"
                        icon={Moon}
                        enabled={form.nightlyEnabled}
                        onEnabledChange={value =>
                            updateForm(
                                "nightlyEnabled",
                                value
                            )
                        }
                        value={form.nightlyPrice}
                        onValueChange={value =>
                            updateForm(
                                "nightlyPrice",
                                value
                            )
                        }
                    />

                    <Button
                        text="Guardar tarifas"
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving}
                    />

                    <Button
                        text="Cancelar"
                        variant="secondary"
                        disabled={saving}
                        onPress={() =>
                            setSelectedRoom(null)
                        }
                    />
                </View>
            </BottomSheet>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    between: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    metrics: {
        flexDirection: "row",
        gap: 8,
    },
    metric: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        gap: 7,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 52,
    },
    searchInput: {
        flex: 1,
        color: C.black,
    },
    loading: {
        paddingVertical: 60,
        alignItems: "center",
    },
    empty: {
        paddingVertical: 50,
        alignItems: "center",
        gap: 12,
    },
    roomCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    priceGrid: {
        flexDirection: "row",
        gap: 10,
    },
    priceBox: {
        flex: 1,
        backgroundColor: C.light,
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    priceLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    sheet: {
        gap: 18,
        paddingBottom: 20,
    },
    rateEditor: {
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: C.white,
        color: C.black,
    },
    disabledInput: {
        opacity: 0.45,
    },
});
