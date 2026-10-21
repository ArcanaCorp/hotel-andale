
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
    ArrowLeft,
    CalendarDays,
    Check,
    ChevronDown,
    Clock3,
    Save,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";
import { getDatabase } from "../../database";

import {
    getBookingConfirmation,
    updateBooking,
} from "../../database/repositories/bookings.repository";

const C = tokens.colors;

function parseLocalDate(value) {
    if (!value) return new Date();

    const [date, time = "00:00:00"] = value.split("T");
    const [y, m, d] = date.split("-").map(Number);
    const [h = 0, min = 0] = time.split(":").map(Number);

    return new Date(y, m - 1, d, h, min);
}

function toLocalISO(date) {
    const pad = n => String(n).padStart(2, "0");

    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}:00`
    );
}

function formatDate(date) {
    return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

function Field({ label, children }) {
    return (
        <View style={styles.field}>
            <TextField
                label={label}
                size="sm"
                weight="medium"
            />
            {children}
        </View>
    );
}

export default function EditBooking() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const bookingId = Number(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [code, setCode] = useState("");
    const [guestName, setGuestName] = useState("");

    const [rooms, setRooms] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [roomSheet, setRoomSheet] = useState(false);

    const [billingMode, setBillingMode] =
        useState("NIGHTLY");

    const [startAt, setStartAt] = useState(new Date());
    const [endAt, setEndAt] = useState(new Date());

    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");

    const [picker, setPicker] = useState(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                setLoading(true);

                try {
                    if (!Number.isSafeInteger(bookingId) ||
                        bookingId <= 0) {
                        throw new Error("Reserva inválida.");
                    }

                    const db = await getDatabase();

                    const [booking, roomList] =
                        await Promise.all([
                            getBookingConfirmation(bookingId),
                            db.getAllAsync(`
                                SELECT
                                    r.id,
                                    r.number,
                                    rt.name AS room_type
                                FROM rooms r
                                JOIN room_types rt
                                  ON rt.id = r.room_type_id
                                WHERE r.is_active = 1
                                  AND r.operational_status
                                      NOT IN (
                                          'MAINTENANCE',
                                          'CLEANING'
                                      )
                                ORDER BY r.number
                            `),
                        ]);

                    if (!booking) {
                        throw new Error(
                            "No se encontró la reserva."
                        );
                    }

                    if (!["PENDING", "CONFIRMED"].includes(
                        booking.status
                    )) {
                        throw new Error(
                            "Esta reserva ya no puede editarse."
                        );
                    }

                    if (!active) return;

                    setCode(booking.booking_code);
                    setGuestName(
                        `${booking.first_name} ${booking.last_name}`
                    );

                    setRooms(roomList);
                    setRoomId(booking.room_id);
                    setBillingMode(booking.billing_mode);
                    setStartAt(parseLocalDate(booking.start_at));
                    setEndAt(parseLocalDate(booking.end_at));

                    setPrice(
                        (
                            booking.agreed_price_cents / 100
                        ).toFixed(2)
                    );

                    setNotes(booking.notes || "");
                } catch (error) {
                    if (active) {
                        Alert.alert(
                            "Error",
                            error?.message ||
                                "No se pudo cargar la reserva."
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
        }, [bookingId])
    );

    const selectedRoom = rooms.find(
        room => room.id === roomId
    );

    const openPicker = (field, mode) => {
        setPicker({ field, mode });
    };

    const handleDateChange = (event, selectedDate) => {
        if (!picker) return;

        const currentPicker = picker;
        setPicker(null);

        if (event.type !== "set" || !selectedDate) {
            return;
        }

        const current =
            currentPicker.field === "start"
                ? startAt
                : endAt;

        const updated = new Date(current);

        if (currentPicker.mode === "date") {
            updated.setFullYear(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
            );
        } else {
            updated.setHours(
                selectedDate.getHours(),
                selectedDate.getMinutes(),
                0,
                0
            );
        }

        if (currentPicker.field === "start") {
            setStartAt(updated);
        } else {
            setEndAt(updated);
        }
    };

    const handleSave = async () => {
        if (saving) return;

        if (!roomId) {
            Alert.alert(
                "Habitación requerida",
                "Selecciona una habitación."
            );
            return;
        }

        if (endAt <= startAt) {
            Alert.alert(
                "Fechas inválidas",
                "La salida debe ser posterior al ingreso."
            );
            return;
        }

        const normalizedPrice = price.trim().replace(",", ".");

        if (!/^\d+(\.\d{1,2})?$/.test(normalizedPrice)) {
            Alert.alert(
                "Precio inválido",
                "Ingresa un importe válido, con máximo dos decimales."
            );
            return;
        }

        const [whole, decimal = ""] =
            normalizedPrice.split(".");

        const priceCents =
            Number(whole) * 100 +
            Number(decimal.padEnd(2, "0"));

        if (!Number.isSafeInteger(priceCents)) {
            Alert.alert(
                "Precio inválido",
                "El importe es demasiado grande."
            );
            return;
        }

        setSaving(true);

        try {
            await updateBooking(bookingId, {
                roomId,
                billingMode,
                startAt: toLocalISO(startAt),
                endAt: toLocalISO(endAt),
                priceCents,
                notes,
            });

            router.replace({
                pathname: "/reservas/confirmacion",
                params: { id: String(bookingId) },
            });
        } catch (error) {
            Alert.alert(
                "No se pudo guardar",
                error?.message || "Ocurrió un error."
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
                    <TextField
                        label="Cargando reserva..."
                        color="gray"
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

                <View style={{ flex: 1, gap: 4 }}>
                    <TextField
                        label="Editar reserva"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label={code}
                        size="sm"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.summary}>
                <TextField
                    label="Titular"
                    size="xs"
                    color="gray"
                />

                <TextField
                    label={guestName}
                    size="md"
                    weight="semibold"
                />
            </View>

            <Field label="Habitación">
                <Pressable
                    style={styles.select}
                    onPress={() => setRoomSheet(true)}
                >
                    <TextField
                        label={
                            selectedRoom
                                ? `${selectedRoom.number} · ${selectedRoom.room_type}`
                                : "Seleccionar habitación"
                        }
                        size="sm"
                    />
                    <ChevronDown size={18} color={C.gray} />
                </Pressable>
            </Field>

            <Field label="Modalidad de cobro">
                <View style={styles.modeRow}>
                    {[
                        { value: "HOURLY", label: "Por hora" },
                        { value: "NIGHTLY", label: "Por noche" },
                    ].map(mode => (
                        <Pressable
                            key={mode.value}
                            onPress={() =>
                                setBillingMode(mode.value)
                            }
                            style={[
                                styles.mode,
                                billingMode === mode.value &&
                                    styles.modeSelected,
                            ]}
                        >
                            <TextField
                                label={mode.label}
                                size="sm"
                                weight="medium"
                                style={
                                    billingMode === mode.value
                                        ? { color: C.primary }
                                        : undefined
                                }
                            />
                        </Pressable>
                    ))}
                </View>
            </Field>

            {[
                {
                    field: "start",
                    label: "Fecha y hora de ingreso",
                    value: startAt,
                },
                {
                    field: "end",
                    label: "Fecha y hora de salida",
                    value: endAt,
                },
            ].map(item => (
                <Field key={item.field} label={item.label}>
                    <View style={styles.dateRow}>
                        <View style={{ flex: 1 }}>
                            <TextField
                                label={formatDate(item.value)}
                                size="sm"
                                weight="medium"
                            />
                        </View>

                        <Pressable
                            style={styles.dateButton}
                            onPress={() =>
                                openPicker(item.field, "date")
                            }
                        >
                            <CalendarDays
                                size={19}
                                color={C.black}
                            />
                        </Pressable>

                        <Pressable
                            style={styles.dateButton}
                            onPress={() =>
                                openPicker(item.field, "time")
                            }
                        >
                            <Clock3
                                size={19}
                                color={C.black}
                            />
                        </Pressable>
                    </View>
                </Field>
            ))}

            <Field label="Importe acordado (S/)">
                <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={C.gray}
                    style={styles.input}
                />
            </Field>

            <Field label="Observaciones">
                <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                    placeholder="Observaciones de la reserva"
                    placeholderTextColor={C.gray}
                    style={[styles.input, styles.textarea]}
                />
            </Field>

            <Button
                text="Guardar cambios"
                icon={Save}
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                fullWidth
            />

            <BottomSheet
                visible={roomSheet}
                title="Seleccionar habitación"
                onClose={() => setRoomSheet(false)}
            >
                <View style={styles.sheetContent}>
                    {rooms.map(room => (
                        <Pressable
                            key={room.id}
                            style={styles.roomOption}
                            onPress={() => {
                                setRoomId(room.id);
                                setRoomSheet(false);
                            }}
                        >
                            <View style={{ flex: 1, gap: 4 }}>
                                <TextField
                                    label={`Habitación ${room.number}`}
                                    size="sm"
                                    weight="semibold"
                                />

                                <TextField
                                    label={room.room_type}
                                    size="xs"
                                    color="gray"
                                />
                            </View>

                            {roomId === room.id && (
                                <Check
                                    size={19}
                                    color={C.primary}
                                />
                            )}
                        </Pressable>
                    ))}
                </View>
            </BottomSheet>

            {picker && (
                <DateTimePicker
                    value={
                        picker.field === "start"
                            ? startAt
                            : endAt
                    }
                    mode={picker.mode}
                    is24Hour
                    onChange={handleDateChange}
                />
            )}
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: 60,
        alignItems: "center",
        gap: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    summary: {
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.white,
        borderRadius: 14,
        padding: 16,
        gap: 6,
    },
    field: {
        gap: 8,
    },
    select: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        backgroundColor: C.white,
        paddingHorizontal: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    modeRow: {
        flexDirection: "row",
        gap: 10,
    },
    mode: {
        flex: 1,
        paddingVertical: 15,
        alignItems: "center",
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
    },
    modeSelected: {
        borderColor: C.primary,
        backgroundColor: C.light,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 8,
        paddingLeft: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        backgroundColor: C.white,
    },
    dateButton: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 15,
        backgroundColor: C.white,
        color: C.black,
        fontSize: 14,
    },
    textarea: {
        minHeight: 100,
        paddingTop: 14,
    },
    sheetContent: {
        paddingBottom: 16,
    },
    roomOption: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
});