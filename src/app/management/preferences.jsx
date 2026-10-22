
import { useCallback, useState } from "react";

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
    Clock3,
    Coins,
    Moon,
    Pencil,
    SlidersHorizontal,
    Timer,
    Wallet,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    getHotelPreferences,
    updateHotelPreferences,
} from "../../database/repositories/preferences.repository";

const C = tokens.colors;

function parseMoney(value) {
    const normalized = String(value)
        .trim()
        .replace(",", ".");

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        return null;
    }

    const [whole, decimal = ""] =
        normalized.split(".");

    const cents =
        Number(whole) * 100 +
        Number(decimal.padEnd(2, "0"));

    return Number.isSafeInteger(cents)
        ? cents
        : null;
}

const formatMoney = (cents, currency = "PEN") => {
    const symbol =
        currency === "USD" ? "$" : "S/";

    return `${symbol} ${(
        Number(cents || 0) / 100
    ).toFixed(2)}`;
};

function SettingRow({
    icon: Icon,
    title,
    description,
    value,
    onPress,
}) {
    return (
        <Pressable
            style={styles.settingRow}
            onPress={onPress}
        >
            <View style={styles.settingIcon}>
                <Icon size={20} color={C.primary} />
            </View>

            <View style={styles.settingText}>
                <TextField
                    label={title}
                    size="sm"
                    weight="semibold"
                />

                <TextField
                    label={description}
                    size="xs"
                    color="gray"
                />
            </View>

            <View style={styles.settingValue}>
                <TextField
                    label={value}
                    size="sm"
                    weight="medium"
                />

                <Pencil
                    size={15}
                    color={C.gray}
                />
            </View>
        </Pressable>
    );
}

export default function PreferencesScreen() {
    const router = useRouter();

    const [preferences, setPreferences] =
        useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeSheet, setActiveSheet] =
        useState(null);

    const [form, setForm] = useState(null);

    const load = useCallback(async () => {
        try {
            const data = await getHotelPreferences();
            setPreferences(data);
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudieron cargar las preferencias."
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

    const openEditor = section => {
        if (!preferences) return;

        setForm({
            ...preferences,
            hourly_enabled:
                preferences.hourly_enabled === 1,
            nightly_enabled:
                preferences.nightly_enabled === 1,
            night_duration_hours: String(preferences.night_duration_hours ?? 8),
            late_checkout_fee:
                (
                    preferences.late_checkout_fee_cents /
                    100
                ).toFixed(2),
        });

        setActiveSheet(section);
    };

    const updateForm = (key, value) => {
        setForm(previous => ({
            ...previous,
            [key]: value,
        }));
    };

    const closeEditor = () => {
        if (saving) return;

        setActiveSheet(null);
        setForm(null);
    };

    const handleSave = async () => {
        if (!form || saving) return;

        const fee = parseMoney(
            form.late_checkout_fee
        );

        if (fee === null) {
            Alert.alert(
                "Importe inválido",
                "Ingresa un recargo válido."
            );
            return;
        }

        setSaving(true);

        try {
            const updated =
                await updateHotelPreferences({
                    hourly_enabled:
                        form.hourly_enabled,
                    nightly_enabled:
                        form.nightly_enabled,
                    checkout_time:
                        form.checkout_time,
                    night_duration_hours: Number(form.night_duration_hours),
                    late_checkout_fee_cents: fee,
                    currency: form.currency,
                    timezone: form.timezone,
                });

            setPreferences(updated);
            setActiveSheet(null);
            setForm(null);
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

    if (loading) {
        return (
            <ScreenTab>
                <View style={styles.loading}>
                    <ActivityIndicator
                        size="large"
                        color={C.primary}
                    />
                </View>
            </ScreenTab>
        );
    }

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
                        label="Preferencias operativas"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Configuración general del hotel"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {preferences && (
                <>
                    <View style={styles.section}>
                        <TextField
                            label="Modalidades de hospedaje"
                            size="lg"
                            weight="bold"
                        />

                        <SettingRow
                            icon={Timer}
                            title="Hospedaje por horas"
                            description="Reservas con tarifa por hora"
                            value={
                                preferences.hourly_enabled
                                    ? "Activado"
                                    : "Desactivado"
                            }
                            onPress={() =>
                                openEditor("modes")
                            }
                        />

                        <SettingRow
                            icon={Moon}
                            title="Hospedaje por noches"
                            description="Reservas con tarifa por noche"
                            value={
                                preferences.nightly_enabled
                                    ? "Activado"
                                    : "Desactivado"
                            }
                            onPress={() =>
                                openEditor("modes")
                            }
                        />
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Horarios y recargos"
                            size="lg"
                            weight="bold"
                        />

                        <SettingRow
                            icon={Moon}
                            title="Duración de una noche"
                            description="Horas que componen cada noche facturable"
                            value={`${preferences.night_duration_hours} horas`}
                            onPress={() => openEditor("checkout")}
                        />

                        <SettingRow
                            icon={Clock3}
                            title="Hora de check-out"
                            description="Hora de salida establecida"
                            value={
                                preferences.checkout_time
                            }
                            onPress={() =>
                                openEditor("checkout")
                            }
                        />

                        <SettingRow
                            icon={Wallet}
                            title="Salida tardía"
                            description="Recargo fijo de referencia"
                            value={formatMoney(
                                preferences.late_checkout_fee_cents,
                                preferences.currency
                            )}
                            onPress={() =>
                                openEditor("checkout")
                            }
                        />
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Configuración regional"
                            size="lg"
                            weight="bold"
                        />

                        <SettingRow
                            icon={Coins}
                            title="Moneda"
                            description="Moneda del hotel"
                            value={preferences.currency}
                            onPress={() =>
                                openEditor("regional")
                            }
                        />

                        <SettingRow
                            icon={SlidersHorizontal}
                            title="Zona horaria"
                            description="Horario local del establecimiento"
                            value={preferences.timezone}
                            onPress={() =>
                                openEditor("regional")
                            }
                        />
                    </View>
                </>
            )}

            <BottomSheet
                visible={!!activeSheet}
                title={
                    activeSheet === "modes"
                        ? "Modalidades de hospedaje"
                        : activeSheet === "checkout"
                            ? "Horarios y recargos"
                            : "Configuración regional"
                }
                busy={saving}
                onClose={closeEditor}
            >
                {form && (
                    <View style={styles.sheet}>
                        {activeSheet === "modes" && (
                            <>
                                <View style={styles.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <TextField
                                            label="Hospedaje por horas"
                                            size="sm"
                                            weight="semibold"
                                        />
                                        <TextField
                                            label="Permitir reservas por horas"
                                            size="xs"
                                            color="gray"
                                        />
                                    </View>

                                    <Switch
                                        value={form.hourly_enabled}
                                        onValueChange={value =>
                                            updateForm(
                                                "hourly_enabled",
                                                value
                                            )
                                        }
                                        trackColor={{
                                            true: C.primary,
                                        }}
                                    />
                                </View>

                                <View style={styles.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <TextField
                                            label="Hospedaje por noches"
                                            size="sm"
                                            weight="semibold"
                                        />
                                        <TextField
                                            label="Permitir reservas por noches"
                                            size="xs"
                                            color="gray"
                                        />
                                    </View>

                                    <Switch
                                        value={form.nightly_enabled}
                                        onValueChange={value =>
                                            updateForm(
                                                "nightly_enabled",
                                                value
                                            )
                                        }
                                        trackColor={{
                                            true: C.primary,
                                        }}
                                    />
                                </View>
                            </>
                        )}

                        {activeSheet === "checkout" && (
                            <>
                                <View style={styles.formField}>
                                    <TextField label="Horas por noche (1 a 24)" size="sm" weight="medium" />
                                    <TextInput
                                        value={form.night_duration_hours}
                                        onChangeText={value => updateForm("night_duration_hours", value)}
                                        keyboardType="number-pad"
                                        placeholder="8"
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.formField}>
                                    <TextField
                                        label="Hora de check-out"
                                        size="sm"
                                        weight="medium"
                                    />

                                    <TextInput
                                        value={form.checkout_time}
                                        onChangeText={value =>
                                            updateForm(
                                                "checkout_time",
                                                value
                                            )
                                        }
                                        placeholder="12:00"
                                        keyboardType="numbers-and-punctuation"
                                        maxLength={5}
                                        style={styles.input}
                                    />
                                </View>

                                <View style={styles.formField}>
                                    <TextField
                                        label="Recargo por salida tardía"
                                        size="sm"
                                        weight="medium"
                                    />

                                    <TextInput
                                        value={
                                            form.late_checkout_fee
                                        }
                                        onChangeText={value =>
                                            updateForm(
                                                "late_checkout_fee",
                                                value
                                            )
                                        }
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        style={styles.input}
                                    />
                                </View>
                            </>
                        )}

                        {activeSheet === "regional" && (
                            <>
                                <TextField
                                    label="Moneda"
                                    size="sm"
                                    weight="medium"
                                />

                                {[
                                    {
                                        value: "PEN",
                                        label: "Soles (PEN)",
                                    },
                                    {
                                        value: "USD",
                                        label: "Dólares (USD)",
                                    },
                                ].map(option => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.option,
                                            form.currency ===
                                                option.value &&
                                                styles.selected,
                                        ]}
                                        onPress={() =>
                                            updateForm(
                                                "currency",
                                                option.value
                                            )
                                        }
                                    >
                                        <TextField
                                            label={option.label}
                                            size="sm"
                                        />
                                    </Pressable>
                                ))}

                                <TextField
                                    label="Zona horaria"
                                    size="sm"
                                    weight="medium"
                                />

                                <View style={styles.option}>
                                    <TextField
                                        label="America/Lima (UTC-05:00)"
                                        size="sm"
                                    />
                                </View>
                            </>
                        )}

                        <Button
                            text="Guardar cambios"
                            onPress={handleSave}
                            loading={saving}
                            disabled={saving}
                        />

                        <Button
                            text="Cancelar"
                            variant="secondary"
                            onPress={closeEditor}
                            disabled={saving}
                        />
                    </View>
                )}
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
    loading: {
        paddingVertical: 60,
        alignItems: "center",
    },
    section: {
        gap: 12,
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
    },
    settingIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    settingText: {
        flex: 1,
        gap: 5,
    },
    settingValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    sheet: {
        gap: 18,
        paddingBottom: 20,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
    },
    formField: {
        gap: 8,
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
    option: {
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
    },
    selected: {
        borderColor: C.primary,
        backgroundColor: C.light,
    },
});
