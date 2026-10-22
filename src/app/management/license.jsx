
import { useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ArrowLeft,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { tokens } from "../../styles/tokens";

import { useLicense } from "../../context/LicenseContext";
import { displayInstallationId } from "../../license/protocol";

const C = tokens.colors;

export default function LicenseScreen() {
    const router = useRouter();

    const { id, active, reason, loading, refresh } = useLicense();
    useFocusEffect(useCallback(() => {
        refresh().catch(error => Alert.alert("Error", error.message));
    }, [refresh]));
    const installationId = id ? displayInstallationId(id) : "No disponible";

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
                                label="Licencia vinculada al dispositivo"
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
                                    "No aplica: el token actual no incluye vencimiento"
                                }
                                size="sm"
                                weight="medium"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <TextField label="ID de instalación" size="sm" color="gray" />
                        <TextField label={installationId} size="md" weight="semibold" selectable />
                        <TextField label="La activación se realiza únicamente al iniciar Hotel Ándale." size="xs" color="gray" />
                        {!!reason && <TextField label={reason} size="xs" color="gray" />}
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
