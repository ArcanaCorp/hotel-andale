
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
    useRouter,
} from "expo-router";

import {
    ArrowLeft,
    Banknote,
    Check,
    ChevronDown,
    CreditCard,
    Plus,
    Smartphone,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    listPayments,
    listReceivableReservations,
    getPaymentsSummary,
    registerPayment,
} from "../../database/repositories/payments.repository";

const C = tokens.colors;

const METHODS = [
    { value: "CASH", label: "Efectivo" },
    { value: "YAPE", label: "Yape" },
    { value: "PLIN", label: "Plin" },
    { value: "TRANSFER", label: "Transferencia" },
    { value: "CARD", label: "Tarjeta" },
];

const money = cents =>
    `S/ ${(Number(cents || 0) / 100).toFixed(2)}`;

function parseMoney(value) {
    const normalized =
        value.trim().replace(",", ".");

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        throw new Error(
            "Ingresa un monto válido."
        );
    }

    const [whole, decimal = ""] =
        normalized.split(".");

    const cents =
        Number(whole) * 100 +
        Number(decimal.padEnd(2, "0"));

    if (
        !Number.isSafeInteger(cents) ||
        cents <= 0
    ) {
        throw new Error(
            "El monto debe ser mayor a cero."
        );
    }

    return cents;
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

export default function PaymentsScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [payments, setPayments] = useState([]);
    const [reservations, setReservations] =
        useState([]);

    const [summary, setSummary] = useState(null);

    const [paymentSheet, setPaymentSheet] =
        useState(false);
    const [reservationSheet, setReservationSheet] =
        useState(false);

    const [reservationId, setReservationId] =
        useState(null);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] =
        useState("CASH");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");

    const load = useCallback(async () => {
        try {
            const [
                paymentRows,
                reservationRows,
                totals,
            ] = await Promise.all([
                listPayments(),
                listReceivableReservations(),
                getPaymentsSummary(),
            ]);

            setPayments(paymentRows);
            setReservations(reservationRows);
            setSummary(totals);
        } catch (error) {
            console.log(error);
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudieron cargar los pagos."
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

    const selectedReservation =
        reservations.find(
            item => item.id === reservationId
        );

    const remainingCents = selectedReservation
        ? selectedReservation.total_cents -
          selectedReservation.paid_cents
        : 0;

    const resetForm = () => {
        setReservationId(null);
        setAmount("");
        setPaymentMethod("CASH");
        setReference("");
        setNotes("");
    };

    const openForm = () => {
        resetForm();
        setPaymentSheet(true);
    };

    const selectReservation = item => {
        setReservationId(item.id);

        setAmount(
            (
                (
                    item.total_cents -
                    item.paid_cents
                ) / 100
            ).toFixed(2)
        );

        setReservationSheet(false);
    };

    const handleSave = async () => {
        if (saving) return;

        if (!reservationId) {
            Alert.alert(
                "Reserva requerida",
                "Selecciona una reserva."
            );
            return;
        }

        setSaving(true);

        try {
            await registerPayment({
                reservationId,
                amountCents: parseMoney(amount),
                paymentMethod,
                reference,
                notes,
            });

            setPaymentSheet(false);
            resetForm();
            await load();

            Alert.alert(
                "Cobro registrado",
                "El pago se guardó y se incorporó a la caja."
            );
        } catch (error) {
            Alert.alert(
                "No se pudo registrar",
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
                        label="Pagos y cobros"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Historial y métodos de pago"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.totalCard}>
                <TextField
                    label="Total cobrado"
                    size="sm"
                    color="gray"
                />

                <TextField
                    label={money(summary?.total_cents)}
                    size="2xl"
                    weight="bold"
                />

                <TextField
                    label={`${summary?.payments_count || 0} pagos registrados · Histórico`}
                    size="xs"
                    color="gray"
                />
            </View>

            <View style={styles.metrics}>
                <View style={styles.metric}>
                    <Banknote
                        size={21}
                        color={C.primary}
                    />

                    <TextField
                        label="Efectivo"
                        size="xs"
                        color="gray"
                    />

                    <TextField
                        label={money(summary?.cash_cents)}
                        size="lg"
                        weight="bold"
                    />
                </View>

                <View style={styles.metric}>
                    <Smartphone
                        size={21}
                        color={C.primary}
                    />

                    <TextField
                        label="Digital"
                        size="xs"
                        color="gray"
                    />

                    <TextField
                        label={money(summary?.digital_cents)}
                        size="lg"
                        weight="bold"
                    />
                </View>
            </View>

            <Button
                text="Registrar cobro"
                icon={Plus}
                onPress={openForm}
            />

            <View style={styles.section}>
                <TextField
                    label="Historial de pagos"
                    size="lg"
                    weight="bold"
                />

                {payments.length === 0 ? (
                    <View style={styles.empty}>
                        <CreditCard
                            size={30}
                            color={C.gray}
                        />

                        <TextField
                            label="No hay pagos registrados."
                            size="sm"
                            color="gray"
                        />
                    </View>
                ) : (
                    payments.map(item => (
                        <View
                            key={item.id}
                            style={styles.paymentRow}
                        >
                            <View style={styles.paymentIcon}>
                                {item.payment_method ===
                                "CASH" ? (
                                    <Banknote
                                        size={21}
                                        color={C.primary}
                                    />
                                ) : (
                                    <CreditCard
                                        size={21}
                                        color={C.primary}
                                    />
                                )}
                            </View>

                            <View style={{
                                flex: 1,
                                gap: 5,
                            }}>
                                <TextField
                                    label={
                                        item.booking_code ||
                                        `Reserva #${item.reservation_id}`
                                    }
                                    size="sm"
                                    weight="semibold"
                                />

                                <TextField
                                    label={
                                        `${item.first_name} ${item.last_name}`
                                    }
                                    size="xs"
                                    color="gray"
                                />

                                <TextField
                                    label={
                                        METHODS.find(
                                            method =>
                                                method.value ===
                                                item.payment_method
                                        )?.label ||
                                        item.payment_method
                                    }
                                    size="xs"
                                    color="gray"
                                />
                            </View>

                            <TextField
                                label={money(
                                    item.amount_cents
                                )}
                                size="sm"
                                weight="semibold"
                            />
                        </View>
                    ))
                )}
            </View>

            {/* REGISTRAR COBRO */}
            <BottomSheet
                visible={paymentSheet}
                title="Registrar cobro"
                busy={saving}
                onClose={() =>
                    setPaymentSheet(false)
                }
            >
                <View style={styles.sheet}>
                    <Field label="Reserva">
                        <Pressable
                            style={styles.select}
                            onPress={() =>
                                setReservationSheet(true)
                            }
                        >
                            <View style={{
                                flex: 1,
                                gap: 4,
                            }}>
                                <TextField
                                    label={
                                        selectedReservation
                                            ?.booking_code ||
                                        "Seleccionar reserva"
                                    }
                                    size="sm"
                                    weight="semibold"
                                />

                                {selectedReservation && (
                                    <TextField
                                        label={
                                            `Habitación ${selectedReservation.room_number}`
                                        }
                                        size="xs"
                                        color="gray"
                                    />
                                )}
                            </View>

                            <ChevronDown
                                size={18}
                                color={C.gray}
                            />
                        </Pressable>
                    </Field>

                    {selectedReservation && (
                        <View style={styles.balance}>
                            <TextField
                                label="Saldo pendiente"
                                size="xs"
                                color="gray"
                            />

                            <TextField
                                label={money(
                                    remainingCents
                                )}
                                size="lg"
                                weight="bold"
                            />
                        </View>
                    )}

                    <Field label="Monto a cobrar (S/)">
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Método de pago">
                        <View style={styles.methods}>
                            {METHODS.map(method => (
                                <Pressable
                                    key={method.value}
                                    onPress={() =>
                                        setPaymentMethod(
                                            method.value
                                        )
                                    }
                                    style={[
                                        styles.method,
                                        paymentMethod ===
                                            method.value &&
                                            styles.methodSelected,
                                    ]}
                                >
                                    <TextField
                                        label={method.label}
                                        size="xs"
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </Field>

                    {paymentMethod !== "CASH" && (
                        <Field label="Número de operación">
                            <TextInput
                                value={reference}
                                onChangeText={setReference}
                                placeholder="Referencia de pago"
                                style={styles.input}
                            />
                        </Field>
                    )}

                    <Field label="Observaciones">
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Opcional"
                            style={styles.input}
                        />
                    </Field>

                    <Button
                        text="Confirmar cobro"
                        loading={saving}
                        disabled={saving}
                        onPress={handleSave}
                    />
                </View>
            </BottomSheet>

            {/* SELECCIONAR RESERVA */}
            <BottomSheet
                visible={reservationSheet}
                title="Seleccionar reserva"
                onClose={() =>
                    setReservationSheet(false)
                }
            >
                <View style={styles.sheet}>
                    {reservations.length === 0 ? (
                        <TextField
                            label="No hay reservas con saldo pendiente."
                            size="sm"
                            color="gray"
                        />
                    ) : (
                        reservations.map(item => (
                            <Pressable
                                key={item.id}
                                style={styles.reservationRow}
                                onPress={() =>
                                    selectReservation(item)
                                }
                            >
                                <View style={{
                                    flex: 1,
                                    gap: 5,
                                }}>
                                    <TextField
                                        label={
                                            item.booking_code
                                        }
                                        size="sm"
                                        weight="semibold"
                                    />

                                    <TextField
                                        label={
                                            `${item.first_name} ${item.last_name} · Hab. ${item.room_number}`
                                        }
                                        size="xs"
                                        color="gray"
                                    />

                                    <TextField
                                        label={
                                            `Pendiente: ${money(
                                                item.agreed_price_cents -
                                                item.paid_cents
                                            )}`
                                        }
                                        size="xs"
                                    />
                                </View>

                                {reservationId === item.id && (
                                    <Check
                                        size={20}
                                        color={C.primary}
                                    />
                                )}
                            </Pressable>
                        ))
                    )}
                </View>
            </BottomSheet>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: 60,
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    totalCard: {
        backgroundColor: C.light,
        borderRadius: 16,
        padding: 20,
        gap: 10,
    },
    metrics: {
        flexDirection: "row",
        gap: 12,
    },
    metric: {
        flex: 1,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 15,
        gap: 8,
    },
    section: {
        gap: 12,
    },
    empty: {
        paddingVertical: 30,
        alignItems: "center",
        gap: 12,
    },
    paymentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    paymentIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    sheet: {
        gap: 16,
        paddingBottom: 20,
    },
    field: {
        gap: 8,
    },
    select: {
        minHeight: 55,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.white,
    },
    balance: {
        backgroundColor: C.light,
        padding: 14,
        borderRadius: 12,
        gap: 6,
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        color: C.black,
        backgroundColor: C.white,
    },
    methods: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    method: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
    },
    methodSelected: {
        borderColor: C.primary,
        backgroundColor: C.light,
    },
    reservationRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
});