import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, BedDouble, CalendarDays, CheckCircle2, UserRound } from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { tokens } from "../../styles/tokens";

import { getCheckInDetails, confirmCheckIn } from "../../services/stays.service";

const C = tokens.colors;

function Detail({ label, value }) {
    return (
        <View style={styles.detail}>
            <TextField label={label} size="sm" color="gray" />
            <TextField label={String(value ?? "—")} size="sm" weight="medium" />
        </View>
    );
}

export default function CheckInScreen() {
    const router = useRouter();
    const { reservationId } = useLocalSearchParams();

    const [details, setDetails] = useState(null);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;

            async function load() {
                try {
                    setLoading(true);

                    if (!reservationId) {
                        throw new Error(
                            "No se indicó una reserva."
                        );
                    }

                    const data = await getCheckInDetails(
                        String(reservationId)
                    );

                    if (mounted) setDetails(data);
                } catch (error) {
                    Alert.alert(
                        "No se pudo cargar",
                        error.message
                    );
                } finally {
                    if (mounted) setLoading(false);
                }
            }

            load();

            return () => {
                mounted = false;
            };
        }, [reservationId])
    );

    const handleCheckIn = () => {
        if (!details || saving) return;

        Alert.alert(
            "Confirmar check-in",
            "¿Confirmas el ingreso del huésped? La habitación pasará a Ocupada.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        setSaving(true);

                        try {
                            await confirmCheckIn(
                                String(reservationId),
                                { notes: notes.trim() }
                            );

                            Alert.alert(
                                "Check-in realizado",
                                "La habitación ahora está ocupada.",
                                [
                                    {
                                        text: "Entendido",
                                        onPress: () =>
                                            router.replace("/(tabs)/bookings"),
                                    },
                                ]
                            );
                        } catch (error) {
                            Alert.alert(
                                "No se pudo realizar el check-in",
                                error.message
                            );
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
                <View style={{ flex: 1 }}>
                    <TextField
                        label="Realizar check-in"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label="Confirmar ingreso del huésped"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator color={C.primary} />
            ) : details ? (
                <>
                    <View style={styles.card}>
                        <TextField
                            label={`Reserva #${details.code}`}
                            size="lg"
                            weight="bold"
                        />

                        <Detail
                            label="Huésped"
                            value={details.guestName}
                        />
                        <Detail
                            label="Habitación"
                            value={details.roomNumber}
                        />
                        <Detail
                            label="Entrada"
                            value={details.checkInDate}
                        />
                        <Detail
                            label="Salida prevista"
                            value={details.checkOutDate}
                        />
                        <Detail
                            label="Tarifa"
                            value={details.rateLabel}
                        />
                    </View>

                    <View style={{ gap: 10 }}>
                        <TextField
                            label="Observaciones"
                            size="md"
                            weight="semibold"
                        />

                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            placeholder="Observaciones del ingreso (opcional)"
                            placeholderTextColor={C.gray}
                            style={styles.notes}
                        />
                    </View>

                    <View style={styles.notice}>
                        <CheckCircle2
                            size={20}
                            color={C.primary}
                        />
                        <View style={{ flex: 1 }}>
                            <TextField
                                label="Al confirmar, la habitación cambiará a Ocupada."
                                size="sm"
                            />
                        </View>
                    </View>

                    <Button
                        text="Confirmar check-in"
                        icon={BedDouble}
                        loading={saving}
                        disabled={saving}
                        onPress={handleCheckIn}
                    />
                </>
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
    card: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 18,
        gap: 18,
    },
    detail: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    notes: {
        minHeight: 100,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        color: C.black,
        textAlignVertical: "top",
    },
    notice: {
        flexDirection: "row",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: C.light,
    },
});
