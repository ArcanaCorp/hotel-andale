
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ArrowLeft,
    KeyRound,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { tokens } from "../../styles/tokens";

import {
    activateLicense,
    getLicenseInfo,
} from "../../services/license.service";

const C = tokens.colors;

export default function LicenseScreen() {
    const router = useRouter();

    const [license, setLicense] = useState(null);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);

    const load = useCallback(async () => {
        try {
            const result = await getLicenseInfo();
            setLicense(result);
        } catch (error) {
            Alert.alert(
                "Error",
                error.message
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

    const handleActivate = async () => {
        setActivating(true);

        try {
            await activateLicense(code);
            setCode("");
            await load();

            Alert.alert(
                "Licencia activada",
                "Tu licencia se activó correctamente."
            );
        } catch (error) {
            Alert.alert(
                "No se pudo activar",
                error.message
            );
        } finally {
            setActivating(false);
        }
    };

    const active = license?.status === "ACTIVE";

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
                        label="Licencia"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Activación y vigencia"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator color={C.primary} />
            ) : (
                <>
                    <View style={styles.statusCard}>
                        <View style={styles.iconBox}>
                            {active ? (
                                <ShieldCheck
                                    size={32}
                                    color={C.primary}
                                />
                            ) : (
                                <ShieldAlert
                                    size={32}
                                    color={C.gray}
                                />
                            )}
                        </View>

                        <TextField
                            label={
                                active
                                    ? "Licencia activa"
                                    : "Licencia no verificada"
                            }
                            size="lg"
                            weight="bold"
                        />

                        <TextField
                            label={
                                active
                                    ? "La licencia de este dispositivo está habilitada."
                                    : "No se ha podido confirmar el estado de activación."
                            }
                            size="sm"
                            color="gray"
                        />

                        <View style={styles.separator} />

                        <View style={styles.detailRow}>
                            <TextField
                                label="Plan"
                                size="sm"
                                color="gray"
                            />

                            <TextField
                                label={license?.plan || "No disponible"}
                                size="sm"
                                weight="medium"
                            />
                        </View>

                        <View style={styles.detailRow}>
                            <TextField
                                label="Vencimiento"
                                size="sm"
                                color="gray"
                            />

                            <TextField
                                label={
                                    license?.expiresAt
                                        ? new Date(
                                            license.expiresAt
                                        ).toLocaleDateString("es-PE")
                                        : "No disponible"
                                }
                                size="sm"
                                weight="medium"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Activar licencia"
                            size="lg"
                            weight="bold"
                        />

                        <TextField
                            label="Ingresa el código proporcionado por ARCANA."
                            size="sm"
                            color="gray"
                        />

                        <View style={styles.inputContainer}>
                            <KeyRound
                                size={20}
                                color={C.gray}
                            />

                            <TextInput
                                style={styles.input}
                                value={code}
                                onChangeText={setCode}
                                placeholder="Código de activación"
                                placeholderTextColor={C.gray}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                        </View>

                        <Button
                            text="Activar licencia"
                            icon={ShieldCheck}
                            loading={activating}
                            disabled={
                                activating ||
                                !code.trim()
                            }
                            onPress={handleActivate}
                        />
                    </View>

                    <View style={styles.note}>
                        <TextField
                            label="La licencia está destinada al uso autorizado de Hotel Ándale. Para recuperar una activación, contacta al proveedor."
                            size="xs"
                            color="gray"
                        />
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
    statusCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        padding: 20,
        alignItems: "center",
        gap: 12,
    },
    iconBox: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    separator: {
        height: 1,
        backgroundColor: C.border,
        alignSelf: "stretch",
        marginVertical: 8,
    },
    detailRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    section: {
        gap: 14,
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    input: {
        flex: 1,
        color: C.black,
        fontSize: 15,
    },
    note: {
        backgroundColor: C.light,
        padding: 16,
        borderRadius: 12,
    },
});
