
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
    ArrowLeft,
    BedDouble,
    CalendarClock,
    CheckCircle2,
    Clock3,
    CreditCard,
    DoorOpen,
    ReceiptText,
    Sparkles,
    UserRound,
    Wallet,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { tokens } from "../../styles/tokens";

import {
    getCheckOutDetails,
    confirmCheckOut,
} from "../../services/stays.service";

const C = tokens.colors;

function formatMoney(value) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
}

function InfoRow({ icon: Icon, label, value }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
                <Icon size={19} color={C.primary} />
            </View>

            <View style={styles.infoContent}>
                <TextField
                    label={label}
                    size="xs"
                    color="gray"
                />

                <TextField
                    label={String(value ?? "—")}
                    size="sm"
                    weight="semibold"
                />
            </View>
        </View>
    );
}

function AmountRow({
    label,
    value,
    strong = false,
    color,
}) {
    return (
        <View style={styles.amountRow}>
            <TextField
                label={label}
                size={strong ? "md" : "sm"}
                weight={strong ? "bold" : "regular"}
                color="gray"
            />

            <TextField
                label={formatMoney(value)}
                size={strong ? "lg" : "md"}
                weight={strong ? "bold" : "semibold"}
                color={color}
            />
        </View>
    );
}

export default function CheckOutScreen() {
    const router = useRouter();
    const { stayId } = useLocalSearchParams();

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const loadDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!stayId) {
                throw new Error(
                    "No se indicó la estadía que deseas finalizar."
                );
            }

            const result = await getCheckOutDetails(
                String(stayId)
            );

            setDetails(result);
        } catch (err) {
            setDetails(null);
            setError(
                err.message ||
                "No se pudo cargar la estadía."
            );
        } finally {
            setLoading(false);
        }
    }, [stayId]);

    useFocusEffect(
        useCallback(() => {
            loadDetails();
        }, [loadDetails])
    );

    const balance = Number(details?.balance || 0);

    const hasPendingBalance = balance > 0;

    const handleCheckOut = () => {
        if (!details || saving) return;

        if (hasPendingBalance) {
            Alert.alert(
                "Saldo pendiente",
                `El huésped todavía tiene un saldo de ${formatMoney(balance)}. Registra el pago antes de finalizar la estadía.`,
                [
                    {
                        text: "Entendido",
                    },
                ]
            );

            return;
        }

        Alert.alert(
            "Confirmar check-out",
            `¿Confirmas la salida del huésped ${details.guestName} de la habitación ${details.roomNumber}?\n\nLa habitación pasará al estado En limpieza.`,
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Confirmar salida",
                    onPress: async () => {
                        try {
                            setSaving(true);

                            await confirmCheckOut(
                                String(stayId)
                            );

                            Alert.alert(
                                "Check-out realizado",
                                `La estadía finalizó correctamente.\n\nLa habitación ${details.roomNumber} ahora está en limpieza.`,
                                [
                                    {
                                        text: "Ver habitaciones",
                                        onPress: () => {
                                            router.replace(
                                                "/(tabs)/rooms"
                                            );
                                        },
                                    },
                                ]
                            );
                        } catch (err) {
                            Alert.alert(
                                "No se pudo realizar el check-out",
                                err.message ||
                                "Ocurrió un error inesperado."
                            );

                            await loadDetails();
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
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

                <View style={styles.headerText}>
                    <TextField
                        label="Check-out"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Finalizar estadía del huésped"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color={C.primary}
                    />

                    <TextField
                        label="Cargando estadía..."
                        size="sm"
                        color="gray"
                    />
                </View>
            ) : error ? (
                <View style={styles.errorCard}>
                    <TextField
                        label="No se pudo cargar la estadía"
                        size="lg"
                        weight="bold"
                    />

                    <TextField
                        label={error}
                        size="sm"
                        color="gray"
                    />

                    <Button
                        text="Reintentar"
                        onPress={loadDetails}
                    />

                    <Button
                        text="Volver"
                        variant="outline"
                        onPress={() => router.back()}
                    />
                </View>
            ) : details ? (
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ESTADO ACTUAL */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusIcon}>
                            <DoorOpen
                                size={27}
                                color={C.primary}
                            />
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                            <TextField
                                label="Estadía activa"
                                size="md"
                                weight="bold"
                            />

                            <TextField
                                label="Lista para verificar la salida"
                                size="xs"
                                color="gray"
                            />
                        </View>

                        <View style={styles.statusDot} />
                    </View>

                    {/* DATOS DE LA ESTADÍA */}
                    <View style={styles.section}>
                        <TextField
                            label="Información de la estadía"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.card}>
                            {details.code ? (
                                <View style={styles.bookingCode}>
                                    <ReceiptText
                                        size={18}
                                        color={C.primary}
                                    />

                                    <TextField
                                        label={`Reserva #${details.code}`}
                                        size="sm"
                                        weight="semibold"
                                    />
                                </View>
                            ) : null}

                            <InfoRow
                                icon={UserRound}
                                label="Huésped titular"
                                value={details.guestName}
                            />

                            <View style={styles.divider} />

                            <InfoRow
                                icon={BedDouble}
                                label="Habitación"
                                value={details.roomNumber}
                            />

                            <View style={styles.divider} />

                            <InfoRow
                                icon={CalendarClock}
                                label="Fecha de ingreso"
                                value={details.checkInDate}
                            />

                            <View style={styles.divider} />

                            <InfoRow
                                icon={Clock3}
                                label="Salida programada"
                                value={details.checkOutDate}
                            />
                        </View>
                    </View>

                    {/* RESUMEN ECONÓMICO */}
                    <View style={styles.section}>
                        <TextField
                            label="Resumen de pagos"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.card}>
                            <View style={styles.paymentHeader}>
                                <View style={styles.paymentIcon}>
                                    <Wallet
                                        size={21}
                                        color={C.primary}
                                    />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <TextField
                                        label="Estado de cuenta"
                                        size="md"
                                        weight="semibold"
                                    />

                                    <TextField
                                        label="Importes registrados durante la reserva y estadía"
                                        size="xs"
                                        color="gray"
                                    />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <AmountRow
                                label="Total de hospedaje y cargos"
                                value={details.total}
                            />

                            <AmountRow
                                label="Pagos realizados"
                                value={details.paid}
                            />

                            <View style={styles.divider} />

                            <AmountRow
                                label="Saldo pendiente"
                                value={Math.max(0, balance)}
                                strong
                            />

                            {hasPendingBalance ? (
                                <View style={styles.pendingNotice}>
                                    <CreditCard
                                        size={20}
                                        color="#B45309"
                                    />

                                    <View style={{ flex: 1 }}>
                                        <TextField
                                            label="Existe un saldo pendiente"
                                            size="sm"
                                            weight="semibold"
                                        />

                                        <TextField
                                            label="Registra el pago restante antes de confirmar la salida."
                                            size="xs"
                                            color="gray"
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.paidNotice}>
                                    <CheckCircle2
                                        size={20}
                                        color="#15803D"
                                    />

                                    <View style={{ flex: 1 }}>
                                        <TextField
                                            label="Sin saldo pendiente"
                                            size="sm"
                                            weight="semibold"
                                        />

                                        <TextField
                                            label="Puedes continuar con el check-out."
                                            size="xs"
                                            color="gray"
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* QUÉ PASARÁ DESPUÉS */}
                    <View style={styles.section}>
                        <TextField
                            label="Después del check-out"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.nextStepCard}>
                            <View style={styles.nextStepIcon}>
                                <Sparkles
                                    size={22}
                                    color={C.primary}
                                />
                            </View>

                            <View style={{ flex: 1, gap: 5 }}>
                                <TextField
                                    label="Habitación en limpieza"
                                    size="md"
                                    weight="semibold"
                                />

                                <TextField
                                    label="La habitación dejará de estar ocupada y pasará a En limpieza. Después podrás marcarla como Disponible."
                                    size="sm"
                                    color="gray"
                                />
                            </View>
                        </View>
                    </View>

                    {/* ACCIONES */}
                    <View style={styles.actions}>
                        <Button
                            text="Confirmar check-out"
                            icon={DoorOpen}
                            loading={saving}
                            disabled={
                                saving ||
                                hasPendingBalance
                            }
                            onPress={handleCheckOut}
                        />

                        <Button
                            text="Actualizar estado de pagos"
                            variant="outline"
                            onPress={loadDetails}
                            disabled={saving}
                        />

                        <Button
                            text="Cancelar"
                            variant="ghost"
                            onPress={() => router.back()}
                            disabled={saving}
                        />
                    </View>
                </ScrollView>
            ) : null}
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerText: {
        flex: 1,
        gap: 3,
    },
    content: {
        gap: 24,
        paddingBottom: 40,
    },
    center: {
        minHeight: 240,
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
    },
    errorCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 20,
        gap: 16,
    },
    statusCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        backgroundColor: C.light,
    },
    statusIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.white,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#16A34A",
    },
    section: {
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 18,
        gap: 18,
        backgroundColor: C.white,
    },
    bookingCode: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingBottom: 4,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    infoContent: {
        flex: 1,
        gap: 5,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: C.border,
    },
    paymentHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    paymentIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.light,
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    pendingNotice: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#FFFBEB",
    },
    paidNotice: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#F0FDF4",
    },
    nextStepCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.light,
    },
    nextStepIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.white,
    },
    actions: {
        gap: 12,
    },
});