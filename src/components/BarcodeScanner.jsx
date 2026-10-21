import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, StatusBar } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, QrCode, CameraOff, ShieldCheck, RefreshCw } from "lucide-react-native";

export default function BarcodeScanner({ licenseQR = false, onScan, onClose }) {
    
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState("");

    const lock = useRef(false);

    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission?.granted, permission?.canAskAgain]);

    function handleScan({ data }) {
        if (lock.current || !data) return;

        const value = String(data).trim();

        if (licenseQR && !/^HA1\./.test(value)) {
            lock.current = true;
            setScanned(true);
            setError("Este QR no contiene una licencia de Hotel Ándale.");
            return;
        }

        lock.current = true;
        setScanned(true);

        onScan?.(value);
    }

    function retry() {
        lock.current = false;
        setScanned(false);
        setError("");
    }

    if (!permission) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.muted}>
                    Preparando cámara...
                </Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContainer}>
                    <CameraOff size={48} color="#fff" />

                    <Text style={styles.heading}>
                        Acceso a la cámara
                    </Text>

                    <Text style={styles.description}>
                        Hotel Ándale necesita permiso para
                        escanear el código QR de tu licencia.
                    </Text>

                    {permission.canAskAgain && (
                        <Pressable
                            style={styles.primaryButton}
                            onPress={requestPermission}
                        >
                            <Text style={styles.primaryButtonText}>
                                Permitir cámara
                            </Text>
                        </Pressable>
                    )}

                    {!permission.canAskAgain && (
                        <Text style={styles.description}>
                            Habilita el permiso de cámara
                            desde la configuración del dispositivo.
                        </Text>
                    )}

                    <Pressable
                        style={styles.secondaryButton}
                        onPress={onClose}
                    >
                        <Text style={styles.secondaryButtonText}>
                            Volver
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="#09090b"
            />

            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"]
                }}
                onBarcodeScanned={
                    scanned ? undefined : handleScan
                }
            />

            <SafeAreaView style={styles.overlay}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.heading}>
                            Escanear licencia
                        </Text>

                        <Text style={styles.description}>
                            Coloca el código QR dentro del recuadro.
                        </Text>
                    </View>

                    <Pressable
                        style={styles.closeButton}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar escáner"
                    >
                        <X size={24} color="#fff" />
                    </Pressable>
                </View>

                {/* SCANNER AREA */}
                <View style={styles.scannerArea}>
                    <View style={styles.frame}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />

                        <QrCode
                            size={46}
                            color="rgba(255,255,255,0.55)"
                        />
                    </View>

                    <Text style={styles.scanHint}>
                        {scanned && !error
                            ? "Código detectado"
                            : "Alinea el QR para escanear"}
                    </Text>
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                    {error ? (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>
                                {error}
                            </Text>

                            <Pressable
                                style={styles.retryButton}
                                onPress={retry}
                            >
                                <RefreshCw size={18} color="#fff" />

                                <Text style={styles.retryText}>
                                    Intentar nuevamente
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.infoCard}>
                            <ShieldCheck size={22} color="#fff" />

                            <Text style={styles.infoText}>
                                El código será verificado de forma
                                segura en tu dispositivo.
                            </Text>
                        </View>
                    )}

                    <Pressable
                        style={styles.cancelButton}
                        onPress={onClose}
                    >
                        <Text style={styles.cancelText}>
                            Cancelar escaneo
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#09090b",
        zIndex: 100
    },

    center: {
        flex: 1,
        backgroundColor: "#09090b",
        justifyContent: "center",
        alignItems: "center",
        gap: 14
    },

    overlay: {
        flex: 1,
        justifyContent: "space-between",
        backgroundColor: "rgba(0,0,0,0.35)"
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: 24
    },

    headerText: {
        flex: 1,
        paddingRight: 16,
        gap: 6
    },

    heading: {
        fontFamily: "Poppins-Bold",
        fontSize: 23,
        color: "#fff"
    },

    description: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        lineHeight: 21,
        color: "#d4d4d8",
        textAlign: "center"
    },

    closeButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
    },

    scannerArea: {
        alignItems: "center",
        justifyContent: "center",
        gap: 24
    },

    frame: {
        width: 260,
        height: 260,
        alignItems: "center",
        justifyContent: "center"
    },

    corner: {
        position: "absolute",
        width: 45,
        height: 45,
        borderColor: "#fff",
        borderWidth: 4
    },

    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 18
    },

    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 18
    },

    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 18
    },

    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 18
    },

    scanHint: {
        fontFamily: "Poppins-Medium",
        fontSize: 13,
        color: "#fff"
    },

    footer: {
        paddingHorizontal: 24,
        paddingBottom: 30,
        gap: 18
    },

    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "rgba(255,255,255,0.12)",
        padding: 18,
        borderRadius: 16
    },

    infoText: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#fff",
        lineHeight: 20
    },

    errorCard: {
        backgroundColor: "rgba(220,38,38,0.2)",
        padding: 18,
        borderRadius: 16,
        gap: 14
    },

    errorText: {
        fontFamily: "Poppins-Medium",
        fontSize: 13,
        color: "#fff"
    },

    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 12,
        backgroundColor: "#dc2626",
        borderRadius: 12
    },

    retryText: {
        fontFamily: "Poppins-SemiBold",
        color: "#fff",
        fontSize: 13
    },

    cancelButton: {
        padding: 14,
        alignItems: "center"
    },

    cancelText: {
        fontFamily: "Poppins-Medium",
        fontSize: 13,
        color: "#fff"
    },

    permissionContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 20
    },

    primaryButton: {
        backgroundColor: "#fff",
        paddingHorizontal: 28,
        paddingVertical: 15,
        borderRadius: 12
    },

    primaryButtonText: {
        fontFamily: "Poppins-SemiBold",
        color: "#18181b"
    },

    secondaryButton: {
        padding: 14
    },

    secondaryButtonText: {
        fontFamily: "Poppins-Medium",
        color: "#fff"
    }
});