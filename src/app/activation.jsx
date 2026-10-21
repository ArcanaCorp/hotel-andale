import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, Building2, KeyRound, LockKeyhole, MessageCircle, QrCode, Share2, ShieldCheck, WifiOff } from "lucide-react-native";

// Implementaremos este componente en el siguiente paso.
import BarcodeScanner from "../components/BarcodeScanner";
import TextInputField from "../components/ui/TextInputField";
import { displayInstallationId } from "../license/protocol";
import { useLicense } from "../context/LicenseContext";
import { COMPANY } from "../constants/company";
import Button from "../components/ui/Button";
import { tokens } from "../styles/tokens";
import Badge from "../components/ui/Badge";
import TextField from "../components/ui/TextField";

const SUPPORT_PHONE = "51966327426";

export default function Activation() {

    const license = useLicense();

    const [code, setCode] = useState("");
    const [scanning, setScanning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const lock = useRef(false);

    const installationId = license.id ? displayInstallationId(license.id) : "";

    const message =
        `Hola ARCANA, quiero adquirir una licencia de Hotel Ándale.\n\n` +
        `Mi ID de instalación es:\n${installationId}\n\n` +
        `Quisiera conocer el precio y las condiciones de activación.`;

    async function activate(value = code) {
        if (lock.current) return;

        lock.current = true;
        setBusy(true);
        setError("");
        setScanning(false);

        try {
            await license.activate(value.trim());
        } catch (err) {
            setError(err?.message || "No se pudo activar la licencia.");
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    async function contact() {
        try {
            const url =
                `https://wa.me/${SUPPORT_PHONE}?text=` +
                encodeURIComponent(message);

            const supported = await Linking.canOpenURL(url);

            if (!supported) {
                throw new Error("WhatsApp no disponible");
            }

            await Linking.openURL(url);
        } catch {
            Alert.alert(
                "No se pudo abrir WhatsApp",
                "Comunícate al +51 966 327 426 e incluye tu ID de instalación."
            );
        }
    }

    async function shareId() {
        try {
            await Share.share({ message });
        } catch {
            Alert.alert(
                "Compartir ID",
                "Selecciona el identificador para copiarlo."
            );
        }
    }

    function handleScan(value) {
        setScanning(false);

        const token = String(value || "").trim();

        if (!token.startsWith("HA1.")) {
            setError("El QR no contiene una licencia válida de Hotel Ándale.");
            return;
        }

        setCode(token);
        activate(token);
    }

    return (
        <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* BRAND */}
                    <View style={styles.brandRow}>
                        <View style={styles.brandIcon}>
                            <Building2 size={22} color="#fff" />
                        </View>
                        <TextField label={'Hotel Ándale'} size="2xl" weight="bold" />
                    </View>

                    {/* HEADER */}
                    <View style={styles.header}>
                        <TextField label={'Activa tu hospedaje'} size="5xl" weight="bold" />
                        <TextField label={'Obtén tu licencia y comienza a administrar tus habitaciones, reservas y huéspedes desde un solo lugar.'} size="sm" weight="regular" color="gray" />
                    </View>

                    {/* BENEFITS */}
                    <View style={styles.benefits}>
                        <Badge text={'100% offline'} icon={WifiOff} variant="default" size="md" />
                        <Badge text={'Licencia segura'} icon={ShieldCheck} variant="default" size="md" />
                    </View>

                    {/* STEP 1 */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.step}>
                                <TextField label={'1'} weight="semibold" color="white" />
                            </View>
                            <TextField label={'Solicita tu licencia'} size="md" weight="bold" />
                        </View>

                        <TextField label={'Comparte tu identificador con ARCANA para recibir una licencia exclusiva para este dispositivo.'} size="sm" weight="regular" color="gray" />

                        <View style={styles.idBox}>
                            <TextField label={'ID DE INSTALACIÓN'} size="sm" color="gray" />
                            <TextField label={installationId || "Generando..."} selectable size="lg" weight="bold" />
                        </View>

                        <Button text={'Solicitar por WhatsApp'} icon={MessageCircle} rightIcon={ArrowRight} onPress={contact} size="lg" />
                        <Button text={'Compartir identificador'} icon={Share2} variant="secondary" onPress={shareId} disabled={!installationId || busy} />

                    </View>

                    {/* STEP 2 */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.step}>
                                <TextField label={'2'} weight="semibold" color="white" />
                            </View>
                            <TextField label={'Activa Hotel Ándale'} size="md" weight="bold" />
                        </View>

                        <TextField label={'Cuando recibas tu licencia, ingresa el código o escanea el QR.'} size="sm" color="gray" />

                        <Button text={'Escanear QR de licencia'} icon={QrCode} variant="secondary" onPress={() => { setError(""); setScanning(true);}} disabled={busy} />

                        <TextField label={'Código de licencia'} size="sm" weight="medium" />

                        <View style={styles.inputContainer}>
                            <KeyRound size={19} color="#71717a"/>
                            <TextInputField
                                value={code}
                                onChangeText={(value) => {
                                    setCode(value);
                                    setError("");
                                }}
                                editable={!busy}
                            />
                        </View>

                        {!!(error || license.reason) && (
                            <TextField label={error || license.reason} size="sm" color="error" />
                        )}

                        <Button text="Activar licencia" icon={LockKeyhole} rightIcon={ArrowRight} loading={busy} disabled={!code.trim()} onPress={() => activate()} size="lg"/>

                    </View>

                    {/* FOOTER */}
                    <View style={styles.footer}>
                        <ShieldCheck size={22} color="#71717a" />
                        <View style={{maxWidth: '90%'}}>
                            <TextField label={'Tu licencia está vinculada a esta instalación.'} size="sm" color="gray" />
                            <TextField label={'Si cambias de dispositivo o borras los datos, deberás solicitar una nueva activación.'} size="sm" color="gray" />
                        </View>
                    </View>

                    <View style={styles.legalRow}>
                        <Button text={'Términos y condiciones'} variant="link" textColor={tokens.colors.gray} size="sm" />
                        <Text style={styles.legalText}>·</Text>
                        <Button text={'Política de privacidad'} variant="link" textColor={tokens.colors.gray} size="sm" />
                    </View>

                    <TextField label={`© ${COMPANY.name}`} color="gray" size="sm" align="center" />
                </ScrollView>

                {scanning && (
                    <BarcodeScanner licenseQR onScan={handleScan} onClose={() => setScanning(false)} />
                )}

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#fafafa"
    },

    content: {
        width: "100%",
        maxWidth: 600,
        alignSelf: "center",
        padding: 24,
        paddingBottom: 48,
        gap: 20
    },

    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10
    },

    brandIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#18181b",
        justifyContent: "center",
        alignItems: "center"
    },

    brand: {
        fontFamily: "Poppins-Bold",
        fontSize: 20,
        color: "#18181b"
    },

    header: {
        gap: 8,
        marginTop: 12
    },

    heading: {
        fontFamily: "Poppins-Bold",
        fontSize: 29,
        color: "#18181b",
        lineHeight: 39
    },

    muted: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#71717a",
        lineHeight: 21
    },

    benefits: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10
    },

    benefit: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 13,
        paddingVertical: 9,
        backgroundColor: "#f4f4f5",
        borderRadius: 30
    },

    benefitText: {
        fontFamily: "Poppins-Medium",
        fontSize: 12,
        color: "#52525b"
    },

    card: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e4e4e7",
        borderRadius: 20,
        padding: 20,
        gap: 16
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10
    },

    step: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: "#18181b",
        justifyContent: "center",
        alignItems: "center"
    },

    stepText: {
        color: "#fff",
        fontFamily: "Poppins-Bold",
        fontSize: 14
    },

    title: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#18181b",
        flexShrink: 1
    },

    idBox: {
        backgroundColor: "#f4f4f5",
        padding: 16,
        borderRadius: 12,
        gap: 8
    },

    label: {
        fontFamily: "Poppins-Medium",
        fontSize: 10,
        color: "#71717a",
        letterSpacing: 1
    },

    id: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#18181b",
        lineHeight: 28
    },

    primaryButton: {
        minHeight: 52,
        backgroundColor: "#18181b",
        borderRadius: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 15,
        gap: 10
    },

    primaryButtonText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 13,
        color: "#fff",
        flexShrink: 1
    },

    secondaryButton: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: "#e4e4e7",
        borderRadius: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10
    },

    secondaryButtonText: {
        fontFamily: "Poppins-Medium",
        fontSize: 13,
        color: "#18181b"
    },

    scannerButton: {
        minHeight: 52,
        backgroundColor: "#f4f4f5",
        borderRadius: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10
    },

    inputLabel: {
        fontFamily: "Poppins-Medium",
        fontSize: 12,
        color: "#3f3f46"
    },

    inputContainer: {
        minHeight: 55,
        borderWidth: 1,
        borderColor: "#e4e4e7",
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10
    },

    input: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#18181b",
        paddingVertical: 12,
        maxHeight: 120
    },

    error: {
        fontFamily: "Poppins-Regular",
        color: "#dc2626",
        fontSize: 12,
        lineHeight: 19
    },

    disabled: {
        opacity: 0.5
    },

    footer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 4
    },

    footerText: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#71717a",
        lineHeight: 20
    },

    legalRow: {
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 8
    },

    legalText: {
        fontFamily: "Poppins-Medium",
        fontSize: 11,
        color: "#71717a"
    },

    copyright: {
        fontFamily: "Poppins-Regular",
        fontSize: 11,
        color: "#a1a1aa",
        textAlign: "center"
    }
});