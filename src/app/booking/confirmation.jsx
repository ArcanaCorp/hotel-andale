
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, } from "expo-router";

import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { ChevronLeft, CheckCircle2, Image as ImageIcon, FileText, MapPin, Phone, Pencil, XCircle, } from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

import { getBookingConfirmation, cancelBooking } from "../../database/repositories/bookings.repository";
import { tokens } from "../../styles/tokens";

const C = {
    white: "#ffffff",
    black: "#18181b",
    gray: "#71717a",
    border: "#e4e4e7",
    light: "#f4f4f5",
    primary: tokens.colors.primary,
    success: "#16a34a",
};

function formatDate(value) {
    if (!value) return "—";

    // Evita conversiones UTC que alteren
    // la hora local almacenada.
    const [date, time = ""] = value.split("T");
    const parts = date.split("-");

    if (parts.length !== 3) return value;

    return (
        `${parts[2]}/${parts[1]}/${parts[0]}` +
        (time ? ` · ${time.slice(0, 5)}` : "")
    );
}

function Detail({ label, value }) {
    return (
        <View style={styles.detail}>
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
    );
}

function ReservationCard({ booking }) {
    const hotel = booking.hotel || {};

    const hotelName =
        hotel.name ||
        hotel.nombre_comercial ||
        hotel.razon_social ||
        "Hotel Ándale";

    const hotelAddress =
        hotel.address ||
        hotel.direccion ||
        "";

    const hotelPhone =
        hotel.phone ||
        hotel.telefono ||
        "";

    const hotelLogo =
        hotel.logo_uri ||
        hotel.logoUri ||
        null;

    const qrValue =
        `ANDALE-HOTEL:RESERVATION:${booking.qr_token}`;

    const statusLabel = {
        PENDING: "Reserva pendiente",
        CONFIRMED: "Reserva confirmada",
        CHECKED_IN: "Ingreso registrado",
        CANCELLED: "Reserva cancelada",
        NO_SHOW: "No se presentó",
    }[booking.status] || booking.status;

    return (
        <View
            style={styles.card}
            collapsable={false}
        >
            {/* HOTEL */}
            <View style={styles.hotelHeader}>
                {hotelLogo ? (
                    <Image
                        source={{ uri: hotelLogo }}
                        style={styles.hotelLogo}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.hotelIcon}>
                        <TextField
                            label="H"
                            size="2xl"
                            weight="bold"
                            style={{ color: C.primary }}
                        />
                    </View>
                )}

                <View style={{ flex: 1, gap: 5 }}>
                    <TextField
                        label={hotelName}
                        size="lg"
                        weight="bold"
                    />

                    {!!hotelAddress && (
                        <View style={styles.inline}>
                            <MapPin size={12} color={C.gray} />
                            <View style={{ flex: 1 }}>
                                <TextField
                                    label={hotelAddress}
                                    size="xs"
                                    color="gray"
                                />
                            </View>
                        </View>
                    )}

                    {!!hotelPhone && (
                        <View style={styles.inline}>
                            <Phone size={12} color={C.gray} />
                            <TextField
                                label={hotelPhone}
                                size="xs"
                                color="gray"
                            />
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.divider} />

            {/* CÓDIGO */}
            <View style={styles.center}>
                <TextField
                    label="COMPROBANTE DE RESERVA"
                    size="xs"
                    weight="semibold"
                    color="gray"
                />

                <TextField
                    label={booking.booking_code}
                    size="2xl"
                    weight="bold"
                    style={{ color: C.primary }}
                />

                <View style={styles.statusBadge}>
                    <TextField
                        label={statusLabel}
                        size="xs"
                        weight="semibold"
                    />
                </View>
            </View>

            <View style={styles.divider} />

            {/* DETALLES */}
            <View style={styles.details}>
                <Detail
                    label="Titular de la reserva"
                    value={
                        `${booking.first_name} ${booking.last_name}`
                    }
                />

                <Detail
                    label="Habitación"
                    value={
                        `${booking.room_number} · ${booking.room_type}`
                    }
                />

                <View style={styles.twoColumns}>
                    <View style={{ flex: 1 }}>
                        <Detail
                            label="Ingreso"
                            value={formatDate(booking.start_at)}
                        />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Detail
                            label="Salida"
                            value={formatDate(booking.end_at)}
                        />
                    </View>
                </View>

                <View style={styles.twoColumns}>
                    <View style={{ flex: 1 }}>
                        <Detail
                            label="Modalidad"
                            value={
                                booking.billing_mode === "HOURLY"
                                    ? "Por hora"
                                    : "Por noche"
                            }
                        />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Detail
                            label="Importe acordado"
                            value={
                                `S/ ${(
                                    Number(
                                        booking.agreed_price_cents || 0
                                    ) / 100
                                ).toFixed(2)}`
                            }
                        />
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {/* QR */}
            <View style={styles.qrSection}>
                <TextField
                    label="Tu código de ingreso"
                    size="md"
                    weight="bold"
                />

                <View style={styles.qrBox}>
                    <QRCode
                        value={qrValue}
                        size={210}
                        color={C.black}
                        backgroundColor={C.white}
                        ecl="H"
                        quietZone={10}
                    />
                </View>

                <TextField
                    label={booking.booking_code}
                    size="lg"
                    weight="bold"
                />

                <TextField
                    label="Presenta este QR en recepción para localizar tu reserva."
                    size="xs"
                    color="gray"
                    style={{ textAlign: "center" }}
                />
            </View>

            <View style={styles.divider} />

            {/* PIE */}
            <View style={styles.footer}>
                {!!hotel.ruc && (
                    <TextField
                        label={`RUC: ${hotel.ruc}`}
                        size="xs"
                        color="gray"
                    />
                )}

                <TextField
                    label="El ingreso está sujeto a verificación de identidad y registro de huéspedes. Este documento no es un comprobante de pago."
                    size="xs"
                    color="gray"
                    style={{ textAlign: "center" }}
                />

                <TextField
                    label="Gestionado con Hotel Ándale"
                    size="xs"
                    color="gray"
                />
            </View>
        </View>
    );
}

export default function BookingConfirmation() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const cardRef = useRef(null);

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const canManage = ["PENDING", "CONFIRMED"].includes(
        booking?.status
    );

    const handleEdit = () => {
        if (!canManage) return;

        router.push({
            pathname: "/reservas/editar",
            params: {
                id: String(booking.id),
            },
        });
    };

    const handleCancel = () => {
        if (!canManage || cancelling) return;

        Alert.alert(
            "Cancelar reserva",
            `¿Estás seguro de cancelar la reserva ${booking.booking_code}?\n\nLa reserva permanecerá en el historial, pero dejará de bloquear la habitación.`,
            [
                {
                    text: "Volver",
                    style: "cancel",
                },
                {
                    text: "Cancelar reserva",
                    style: "destructive",
                    onPress: async () => {
                        setCancelling(true);

                        try {
                            await cancelBooking(booking.id);

                            const updated =
                                await getBookingConfirmation(
                                    booking.id
                                );

                            if (updated) {
                                setBooking(updated);
                            }

                            Alert.alert(
                                "Reserva cancelada",
                                "La reserva se canceló correctamente."
                            );
                        } catch (error) {
                            Alert.alert(
                                "No se pudo cancelar",
                                error?.message ||
                                    "Ocurrió un error."
                            );
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ]
        );
    };

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                setLoading(true);

                try {
                    const bookingId = Number(id);

                    if (!Number.isSafeInteger(bookingId) ||
                        bookingId <= 0) {
                        throw new Error("Reserva inválida.");
                    }

                    const result =
                        await getBookingConfirmation(bookingId);

                    if (!result) {
                        throw new Error(
                            "No se encontró la reserva."
                        );
                    }

                    if (!result.qr_token) {
                        throw new Error(
                            "La reserva no tiene un token QR. Revisa la migración 008 y createBooking()."
                        );
                    }

                    if (active) setBooking(result);
                } catch (error) {
                    if (active) {
                        Alert.alert(
                            "Error",
                            error?.message ||
                            "No se pudo cargar la confirmación."
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
        }, [id])
    );

    const captureCard = async () => {
        if (!cardRef.current) {
            throw new Error(
                "La tarjeta todavía no está lista."
            );
        }

        return cardRef.current.capture();
    };

    const shareImage = async () => {
        if (sharing || !booking) return;

        setSharing(true);

        try {
            const available =
                await Sharing.isAvailableAsync();

            if (!available) {
                throw new Error(
                    "Compartir archivos no está disponible."
                );
            }

            const uri = await captureCard();

            await Sharing.shareAsync(uri, {
                mimeType: "image/png",
                dialogTitle:
                    `Reserva ${booking.booking_code}`,
                UTI: "public.png",
            });
        } catch (error) {
            Alert.alert(
                "Error al compartir",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setSharing(false);
        }
    };

    const sharePdf = async () => {
        if (sharing || !booking) return;

        setSharing(true);

        try {
            const available =
                await Sharing.isAvailableAsync();

            if (!available) {
                throw new Error(
                    "Compartir archivos no está disponible."
                );
            }

            const imageUri = await captureCard();

            const base64 =
                await FileSystem.readAsStringAsync(
                    imageUri,
                    {
                        encoding:
                            FileSystem.EncodingType.Base64,
                    }
                );

            const html = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta name="viewport"
                              content="width=device-width,
                                       initial-scale=1">
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                background: white;
                                text-align: center;
                            }

                            img {
                                display: block;
                                width: 100%;
                                max-width: 520px;
                                height: auto;
                                margin: 0 auto;
                            }
                        </style>
                    </head>

                    <body>
                        <img
                            src="data:image/png;base64,${base64}"
                        />
                    </body>
                </html>
            `;

            const result = await Print.printToFileAsync({
                html,
            });

            const filename =
                `${booking.booking_code}.pdf`;

            const destination =
                `${FileSystem.cacheDirectory}${filename}`;

            await FileSystem.copyAsync({
                from: result.uri,
                to: destination,
            });

            await Sharing.shareAsync(destination, {
                mimeType: "application/pdf",
                dialogTitle: filename,
                UTI: "com.adobe.pdf",
            });
        } catch (error) {
            Alert.alert(
                "Error al generar PDF",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setSharing(false);
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
                        label="Cargando confirmación..."
                        size="sm"
                        color="gray"
                    />
                </View>
            </ScreenTab>
        );
    }

    if (!booking) {
        return (
            <ScreenTab>
                <TextField
                    label="No se pudo mostrar la reserva."
                    size="md"
                />

                <Button
                    text="Volver"
                    onPress={() => router.back()}
                />
            </ScreenTab>
        );
    }

    return (
        <ScreenTab>
            <View style={styles.header}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <Button icon={ChevronLeft} iconOnly variant="ghost" onPress={() => router.replace("/(tabs)/bookings")}/>
                    <TextField label="Confirmación" size="2xl" weight="bold"/>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    {canManage && (
                        <>
                            <Button icon={Pencil} iconOnly variant="secondary" onPress={handleEdit} disabled={sharing || cancelling}/>
                            <Button icon={XCircle} iconOnly variant="dangerSoft" onPress={handleCancel} loading={cancelling} disabled={sharing || cancelling}/>
                        </>
                    )}
                </View>
            </View>

            <View style={styles.success}>
                <CheckCircle2
                    size={34}
                    color={C.success}
                />

                <TextField
                    label="Reserva registrada"
                    size="lg"
                    weight="bold"
                />

                <TextField
                    label="Comparte este comprobante con el huésped."
                    size="sm"
                    color="gray"
                    style={{ textAlign: "center" }}
                />
            </View>

            <ViewShot
                ref={cardRef}
                style={styles.capture}
                options={{
                    format: "png",
                    quality: 1,
                    result: "tmpfile",
                }}
            >
                <ReservationCard booking={booking} />
            </ViewShot>

            <View style={styles.actions}>
                <Button text="Compartir imagen" icon={ImageIcon} loading={sharing} disabled={sharing} onPress={shareImage} fullWidth/>
                <Button text="Compartir PDF" icon={FileText} variant="secondary" disabled={sharing} onPress={sharePdf} fullWidth/>
            </View>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        justifyContent: 'space-between',
    },
    loading: {
        paddingVertical: 60,
        alignItems: "center",
        gap: 16,
    },
    success: {
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
    },
    capture: {
        width: "100%",
        backgroundColor: C.white,
    },
    card: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        padding: 20,
        gap: 20,
    },
    hotelHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    hotelLogo: {
        width: 62,
        height: 62,
        borderRadius: 12,
    },
    hotelIcon: {
        width: 62,
        height: 62,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    inline: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
    },
    center: {
        alignItems: "center",
        gap: 10,
    },
    statusBadge: {
        backgroundColor: C.light,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    details: {
        gap: 16,
    },
    detail: {
        gap: 5,
    },
    twoColumns: {
        flexDirection: "row",
        gap: 14,
    },
    qrSection: {
        alignItems: "center",
        gap: 12,
    },
    qrBox: {
        backgroundColor: C.white,
        padding: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
    },
    footer: {
        alignItems: "center",
        gap: 8,
    },
    actions: {
        gap: 12,
        paddingBottom: 12,
    },
});