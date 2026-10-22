import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, Camera, ChevronRight, ScanLine, Search, X } from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { tokens } from "../../styles/tokens";

import { getPendingCheckInReservations, resolveReservationQR } from "../../services/stays.service";

const C = tokens.colors;

export default function CheckInScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    const [cameraOpen, setCameraOpen] = useState(false);
    const [scanLocked, setScanLocked] = useState(false);
    const [search, setSearch] = useState("");
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                try {
                    setLoading(true);

                    const data =
                        await getPendingCheckInReservations();

                    if (active) {
                        setReservations(data);
                    }
                } catch (error) {
                    if (active) {
                        Alert.alert(
                            "Error",
                            error.message
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

    const openCamera = async () => {
        try {
            let granted = permission?.granted;

            if (!granted) {
                const result = await requestPermission();
                granted = result.granted;
            }

            if (!granted) {
                Alert.alert(
                    "Permiso necesario",
                    "Autoriza el acceso a la cámara para escanear reservas."
                );
                return;
            }

            setScanLocked(false);
            setCameraOpen(true);
        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };

    const openReservation = (reservationId) => {
        setCameraOpen(false);

        router.push({
            pathname: "/stays/check-in-details",
            params: {
                reservationId: String(reservationId),
            },
        });
    };

    
    const handleScan = async ({ data }) => {
        if (scanLocked) return;

        setScanLocked(true);

        try {
            const reservation =
                await resolveReservationQR(data);

            setCameraOpen(false);

            if (reservation.nextAction === "CHECK_IN") {
                router.push({
                    pathname: "/stays/check-in-details",
                    params: {
                        reservationId: String(reservation.id),
                    },
                });

                return;
            }

            if (reservation.nextAction === "CHECK_OUT") {
                Alert.alert(
                    "Estadía activa",
                    `La reserva ${reservation.code} ya tiene un check-in registrado. ¿Deseas realizar el check-out?`,
                    [
                        {
                            text: "Cancelar",
                            style: "cancel",
                            onPress: () => setScanLocked(false),
                        },
                        {
                            text: "Ver check-out",
                            onPress: () => {
                                setScanLocked(false);

                                router.push({
                                    pathname: "/stays/check-out",
                                    params: {
                                        stayId: String(reservation.stayId),
                                    },
                                });
                            },
                        },
                    ]
                );

                return;
            }

            if (reservation.nextAction === "COMPLETED") {
                Alert.alert(
                    "Estadía finalizada",
                    "Esta reserva ya completó su check-out.",
                    [
                        {
                            text: "Entendido",
                            onPress: () => setScanLocked(false),
                        },
                    ]
                );

                return;
            }

            throw new Error(
                "La reserva no está disponible para esta operación."
            );
        } catch (error) {
            setCameraOpen(false);

            Alert.alert(
                "No se pudo procesar el QR",
                error.message,
                [
                    {
                        text: "Entendido",
                        onPress: () => setScanLocked(false),
                    },
                ]
            );
        }
    };

    const filtered = reservations.filter(item => {
        const value = search.trim().toLowerCase();

        if (!value) return true;

        return [
            item.code,
            item.guestName,
            item.roomNumber,
        ].some(field =>
            String(field ?? "")
                .toLowerCase()
                .includes(value)
        );
    });

    return (
        <ScreenTab>
            <View style={styles.header}>
                <Button
                    icon={ArrowLeft}
                    iconOnly
                    variant="ghost"
                    onPress={() => router.replace("/(tabs)/bookings")}
                />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="Check-in"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label="Identifica la reserva del huésped"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {cameraOpen ? (
                <View style={styles.cameraSection}>
                    <View style={styles.cameraHeader}>
                        <TextField
                            label="Escanear reserva"
                            size="lg"
                            weight="bold"
                        />

                        <Pressable
                            onPress={() => setCameraOpen(false)}
                        >
                            <X size={24} color={C.black} />
                        </Pressable>
                    </View>

                    <View style={styles.cameraContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                            onBarcodeScanned={
                                scanLocked
                                    ? undefined
                                    : handleScan
                            }
                        />

                        <View style={styles.scanFrame}>
                            <ScanLine
                                size={170}
                                color="#FFFFFF"
                                strokeWidth={1.5}
                            />
                        </View>
                    </View>

                    <TextField
                        label="Apunta la cámara hacia el QR de la reserva."
                        size="sm"
                        color="gray"
                    />

                    <Button
                        text="Cancelar escaneo"
                        variant="outline"
                        onPress={() => setCameraOpen(false)}
                    />
                </View>
            ) : (
                <>
                    <View style={styles.scanCard}>
                        <ScanLine
                            size={44}
                            color={C.primary}
                        />

                        <TextField
                            label="Escanear código QR"
                            size="lg"
                            weight="bold"
                        />

                        <TextField
                            label="Identifica una reserva utilizando la cámara."
                            size="sm"
                            color="gray"
                        />

                        <Button
                            text="Abrir cámara"
                            icon={Camera}
                            onPress={openCamera}
                        />
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Seleccionar manualmente"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.searchBox}>
                            <Search
                                size={20}
                                color={C.gray}
                            />

                            <TextInput
                                style={styles.input}
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Buscar reserva o huésped"
                                placeholderTextColor={C.gray}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator
                                color={C.primary}
                            />
                        ) : (
                            <FlatList
                                data={filtered}
                                keyExtractor={item =>
                                    String(item.id)
                                }
                                scrollEnabled={false}
                                ListEmptyComponent={
                                    <TextField
                                        label="No hay reservas pendientes."
                                        size="sm"
                                        color="gray"
                                    />
                                }
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={styles.reservationCard}
                                        onPress={() =>
                                            openReservation(item.id)
                                        }
                                    >
                                        <View
                                            style={{
                                                flex: 1,
                                                gap: 6,
                                            }}
                                        >
                                            <TextField
                                                label={`Reserva #${item.code}`}
                                                size="md"
                                                weight="semibold"
                                            />

                                            <TextField
                                                label={item.guestName}
                                                size="sm"
                                            />

                                            <TextField
                                                label={`Habitación ${item.roomNumber}`}
                                                size="xs"
                                                color="gray"
                                            />
                                        </View>

                                        <ChevronRight
                                            size={22}
                                            color={C.gray}
                                        />
                                    </Pressable>
                                )}
                            />
                        )}
                    </View>
                </>
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
    scanCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        padding: 24,
        alignItems: "center",
        gap: 16,
    },
    section: {
        gap: 14,
    },
    searchBox: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 52,
    },
    input: {
        flex: 1,
        color: C.black,
        fontSize: 15,
    },
    reservationCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    cameraSection: {
        gap: 16,
    },
    cameraHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cameraContainer: {
        height: 320,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "#111827",
        justifyContent: "center",
        alignItems: "center",
    },
    scanFrame: {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.1)",
    },
});