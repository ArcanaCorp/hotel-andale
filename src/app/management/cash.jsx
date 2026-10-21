
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
    ArrowDownLeft,
    ArrowUpRight,
    LockKeyhole,
    Plus,
    Wallet,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    getCashSummary,
    openCashSession,
    registerCashMovement,
    listCashMovements,
    closeCashSession,
} from "../../database/repositories/cash.repository";

const C = tokens.colors;

const METHODS = [
    { value: "CASH", label: "Efectivo" },
    { value: "YAPE", label: "Yape" },
    { value: "PLIN", label: "Plin" },
    { value: "TRANSFER", label: "Transferencia" },
    { value: "CARD", label: "Tarjeta" },
];

const CATEGORIES = {
    INCOME: [
        "Otros ingresos",
        "Servicios adicionales",
        "Venta de productos",
        "Ajuste de caja",
    ],
    EXPENSE: [
        "Suministros",
        "Mantenimiento",
        "Servicios",
        "Transporte",
        "Otros egresos",
        "Retiro de efectivo",
    ],
};

const money = cents =>
    `S/ ${(Number(cents || 0) / 100).toFixed(2)}`;

function parseMoney(value) {
    const normalized = value.trim().replace(",", ".");

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        throw new Error("Ingresa un monto válido.");
    }

    const [whole, decimal = ""] = normalized.split(".");

    const cents =
        Number(whole) * 100 +
        Number(decimal.padEnd(2, "0"));

    if (!Number.isSafeInteger(cents)) {
        throw new Error("El monto es demasiado grande.");
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

export default function CashScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [summary, setSummary] = useState(null);
    const [movements, setMovements] = useState([]);

    const [openSheet, setOpenSheet] = useState(false);
    const [movementSheet, setMovementSheet] =
        useState(false);
    const [closeSheet, setCloseSheet] = useState(false);

    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [type, setType] = useState("INCOME");
    const [category, setCategory] = useState(
        "Otros ingresos"
    );
    const [paymentMethod, setPaymentMethod] =
        useState("CASH");

    const load = useCallback(async () => {
        try {
            const data = await getCashSummary();

            setSummary(data);

            if (data) {
                const rows = await listCashMovements(
                    data.id
                );
                setMovements(rows);
            } else {
                setMovements([]);
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudo cargar la caja."
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

    const resetForm = () => {
        setAmount("");
        setNotes("");
        setType("INCOME");
        setCategory("Otros ingresos");
        setPaymentMethod("CASH");
    };

    const handleOpen = async () => {
        if (busy) return;

        setBusy(true);

        try {
            await openCashSession({
                openingAmountCents: parseMoney(amount),
                notes,
            });

            setOpenSheet(false);
            resetForm();
            await load();
        } catch (error) {
            Alert.alert(
                "No se pudo abrir caja",
                error.message
            );
        } finally {
            setBusy(false);
        }
    };

    const handleMovement = async () => {
        if (busy) return;

        setBusy(true);

        try {
            await registerCashMovement({
                type,
                category,
                description: notes,
                amountCents: parseMoney(amount),
                paymentMethod,
            });

            setMovementSheet(false);
            resetForm();
            await load();
        } catch (error) {
            Alert.alert(
                "No se pudo registrar",
                error.message
            );
        } finally {
            setBusy(false);
        }
    };

    const handleClose = async () => {
        if (busy) return;

        let counted;

        try {
            counted = parseMoney(amount);
        } catch (error) {
            Alert.alert("Monto inválido", error.message);
            return;
        }

        const expected = summary.expected_cash_cents;
        const difference = counted - expected;

        Alert.alert(
            "Confirmar cierre",
            `Efectivo esperado: ${money(expected)}\n` +
            `Efectivo contado: ${money(counted)}\n` +
            `Diferencia: ${money(difference)}\n\n` +
            "¿Deseas cerrar la caja?",
            [
                { text: "Volver", style: "cancel" },
                {
                    text: "Cerrar caja",
                    onPress: async () => {
                        setBusy(true);

                        try {
                            await closeCashSession({
                                closingAmountCents: counted,
                                notes,
                            });

                            setCloseSheet(false);
                            resetForm();
                            await load();

                            Alert.alert(
                                "Caja cerrada",
                                "El cierre se registró correctamente."
                            );
                        } catch (error) {
                            Alert.alert(
                                "Error",
                                error.message
                            );
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    const openMovementForm = () => {
        resetForm();
        setMovementSheet(true);
    };

    const openOpeningForm = () => {
        resetForm();
        setOpenSheet(true);
    };

    const openClosingForm = () => {
        resetForm();
        setCloseSheet(true);
    };

    if (loading) {
        return (
            <ScreenTab>
                <View style={styles.loading}>
                    <ActivityIndicator
                        color={C.primary}
                        size="large"
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
                        label="Caja y movimientos"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label="Control financiero diario"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {!summary ? (
                <View style={styles.empty}>
                    <Wallet
                        size={38}
                        color={C.gray}
                    />

                    <TextField
                        label="No hay una caja abierta"
                        size="lg"
                        weight="bold"
                    />

                    <TextField
                        label="Abre una caja para comenzar a registrar movimientos."
                        size="sm"
                        color="gray"
                        style={{ textAlign: "center" }}
                    />

                    <Button
                        text="Abrir caja"
                        icon={Plus}
                        onPress={openOpeningForm}
                        fullWidth
                    />
                </View>
            ) : (
                <>
                    <View style={styles.balanceCard}>
                        <TextField
                            label="Efectivo esperado en caja"
                            size="sm"
                            color="gray"
                        />

                        <TextField
                            label={money(
                                summary.expected_cash_cents
                            )}
                            size="2xl"
                            weight="bold"
                        />

                        <TextField
                            label="Caja abierta"
                            size="xs"
                            style={{ color: "#16a34a" }}
                            weight="semibold"
                        />
                    </View>

                    <View style={styles.metrics}>
                        <View style={styles.metric}>
                            <ArrowDownLeft
                                size={20}
                                color="#16a34a"
                            />

                            <TextField
                                label="Ingresos"
                                size="xs"
                                color="gray"
                            />

                            <TextField
                                label={money(
                                    summary.income_cents
                                )}
                                size="lg"
                                weight="bold"
                            />
                        </View>

                        <View style={styles.metric}>
                            <ArrowUpRight
                                size={20}
                                color="#dc2626"
                            />

                            <TextField
                                label="Egresos"
                                size="xs"
                                color="gray"
                            />

                            <TextField
                                label={money(
                                    summary.expense_cents
                                )}
                                size="lg"
                                weight="bold"
                            />
                        </View>
                    </View>

                    <Button
                        text="Registrar movimiento"
                        icon={Plus}
                        onPress={openMovementForm}
                    />

                    <Button
                        text="Cerrar caja"
                        icon={LockKeyhole}
                        variant="secondary"
                        onPress={openClosingForm}
                    />

                    <View style={styles.section}>
                        <TextField
                            label="Movimientos"
                            size="lg"
                            weight="bold"
                        />

                        {movements.length === 0 ? (
                            <TextField
                                label="Todavía no hay movimientos."
                                size="sm"
                                color="gray"
                            />
                        ) : (
                            movements.map(item => (
                                <View
                                    key={item.id}
                                    style={styles.movement}
                                >
                                    {item.type === "INCOME" ? (
                                        <ArrowDownLeft
                                            size={20}
                                            color="#16a34a"
                                        />
                                    ) : (
                                        <ArrowUpRight
                                            size={20}
                                            color="#dc2626"
                                        />
                                    )}

                                    <View style={{
                                        flex: 1,
                                        gap: 4,
                                    }}>
                                        <TextField
                                            label={item.category}
                                            size="sm"
                                            weight="semibold"
                                        />

                                        <TextField
                                            label={
                                                METHODS.find(
                                                    m =>
                                                        m.value ===
                                                        item.payment_method
                                                )?.label ||
                                                item.payment_method
                                            }
                                            size="xs"
                                            color="gray"
                                        />

                                        {!!item.description && (
                                            <TextField
                                                label={
                                                    item.description
                                                }
                                                size="xs"
                                                color="gray"
                                            />
                                        )}
                                    </View>

                                    <TextField
                                        label={
                                            `${
                                                item.type ===
                                                "INCOME"
                                                    ? "+"
                                                    : "−"
                                            } ${money(
                                                item.amount_cents
                                            )}`
                                        }
                                        size="sm"
                                        weight="semibold"
                                        style={{
                                            color:
                                                item.type ===
                                                "INCOME"
                                                    ? "#16a34a"
                                                    : "#dc2626",
                                        }}
                                    />
                                </View>
                            ))
                        )}
                    </View>
                </>
            )}

            {/* APERTURA */}
            <BottomSheet
                visible={openSheet}
                title="Abrir caja"
                busy={busy}
                onClose={() => setOpenSheet(false)}
            >
                <View style={styles.sheet}>
                    <Field label="Monto inicial en efectivo (S/)">
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Observaciones">
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Opcional"
                            style={styles.input}
                        />
                    </Field>

                    <Button
                        text="Confirmar apertura"
                        loading={busy}
                        onPress={handleOpen}
                    />
                </View>
            </BottomSheet>

            {/* MOVIMIENTO */}
            <BottomSheet
                visible={movementSheet}
                title="Registrar movimiento"
                busy={busy}
                onClose={() => setMovementSheet(false)}
            >
                <View style={styles.sheet}>
                    <Field label="Tipo de movimiento">
                        <View style={styles.row}>
                            {[
                                {
                                    value: "INCOME",
                                    label: "Ingreso",
                                },
                                {
                                    value: "EXPENSE",
                                    label: "Egreso",
                                },
                            ].map(item => (
                                <Pressable
                                    key={item.value}
                                    style={[
                                        styles.choice,
                                        type === item.value &&
                                            styles.selected,
                                    ]}
                                    onPress={() => {
                                        setType(item.value);
                                        setCategory(
                                            CATEGORIES[
                                                item.value
                                            ][0]
                                        );
                                    }}
                                >
                                    <TextField
                                        label={item.label}
                                        size="sm"
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </Field>

                    <Field label="Categoría">
                        <View style={styles.wrap}>
                            {CATEGORIES[type].map(item => (
                                <Pressable
                                    key={item}
                                    onPress={() =>
                                        setCategory(item)
                                    }
                                    style={[
                                        styles.chip,
                                        category === item &&
                                            styles.selected,
                                    ]}
                                >
                                    <TextField
                                        label={item}
                                        size="xs"
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </Field>

                    <Field label="Monto (S/)">
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Método de pago">
                        <View style={styles.wrap}>
                            {METHODS.map(item => (
                                <Pressable
                                    key={item.value}
                                    onPress={() =>
                                        setPaymentMethod(
                                            item.value
                                        )
                                    }
                                    style={[
                                        styles.chip,
                                        paymentMethod ===
                                            item.value &&
                                            styles.selected,
                                    ]}
                                >
                                    <TextField
                                        label={item.label}
                                        size="xs"
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </Field>

                    <Field label="Descripción">
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Detalle del movimiento"
                            style={styles.input}
                        />
                    </Field>

                    <Button
                        text="Guardar movimiento"
                        loading={busy}
                        onPress={handleMovement}
                    />
                </View>
            </BottomSheet>

            {/* CIERRE */}
            <BottomSheet
                visible={closeSheet}
                title="Cerrar caja"
                busy={busy}
                onClose={() => setCloseSheet(false)}
            >
                <View style={styles.sheet}>
                    <TextField
                        label={`Efectivo esperado: ${money(
                            summary?.expected_cash_cents
                        )}`}
                        size="md"
                        weight="semibold"
                    />

                    <Field label="Efectivo contado (S/)">
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Observaciones del cierre">
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Opcional"
                            style={styles.input}
                        />
                    </Field>

                    <Button
                        text="Confirmar cierre"
                        variant="danger-soft"
                        icon={LockKeyhole}
                        loading={busy}
                        onPress={handleClose}
                    />
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
    empty: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        gap: 14,
    },
    balanceCard: {
        backgroundColor: C.light,
        padding: 20,
        borderRadius: 16,
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
    movement: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    sheet: {
        gap: 16,
        paddingBottom: 20,
    },
    field: {
        gap: 8,
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
    row: {
        flexDirection: "row",
        gap: 10,
    },
    choice: {
        flex: 1,
        alignItems: "center",
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
    },
    wrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
    },
    selected: {
        borderColor: C.primary,
        backgroundColor: C.light,
    },
});