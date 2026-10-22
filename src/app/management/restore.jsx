import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { ArrowLeft, ArchiveRestore, FileArchive, ShieldCheck, TriangleAlert } from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

import { tokens } from "../../styles/tokens";

import { selectRestoreFile, inspectRestoreFile, prepareRestore } from "../../services/restore.service";

const C = tokens.colors;

export default function Restore() {

    const router = useRouter();

    const [file, setFile] = useState(null);
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(false);

    const selectFile = async () => {
        setLoading(true);

        try {
            const selected =
                await selectRestoreFile();

            if (!selected) return;

            const result =
                await inspectRestoreFile(
                    selected.uri
                );

            setFile(selected);
            setInspection(result);
        } catch (error) {
            setFile(null);
            setInspection(null);

            Alert.alert(
                "Archivo no válido",
                error.message
            );
        } finally {
            setLoading(false);
        }
    };

    const confirmRestore = () => {
        if (!file || !inspection) return;

        Alert.alert(
            "Preparar restauración",
            "Se verificará y preparará esta copia. Los datos actuales todavía no serán reemplazados.",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Continuar",
                    onPress: async () => {
                        setLoading(true);

                        try {
                            await prepareRestore(file.uri);

                            Alert.alert(
                                "Restauración preparada",
                                "La copia está lista. Cierra y vuelve a abrir Hotel Ándale para iniciar la restauración.",
                                [
                                    {
                                        text: "Entendido",
                                        onPress: () => router.replace("/"),
                                    },
                                ]
                            );
                        } catch (error) {
                            Alert.alert(
                                "Error",
                                error.message
                            );
                        } finally {
                            setLoading(false);
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
                        label="Restaurar copia"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label="Recuperar datos del hotel"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.hero}>
                <ArchiveRestore
                    size={38}
                    color={C.primary}
                />

                <TextField
                    label="Selecciona una copia"
                    size="lg"
                    weight="bold"
                />

                <TextField
                    label="Elige un respaldo ZIP de Hotel Ándale almacenado en tu teléfono."
                    size="sm"
                    color="gray"
                />

                <Button
                    text="Seleccionar archivo ZIP"
                    icon={FileArchive}
                    onPress={selectFile}
                    loading={loading}
                />
            </View>

            {inspection && (
                <View style={styles.details}>
                    <View style={styles.row}>
                        <ShieldCheck
                            size={22}
                            color={C.primary}
                        />

                        <TextField
                            label="Formato reconocido"
                            size="md"
                            weight="semibold"
                        />
                    </View>

                    <TextField
                        label={`Archivo: ${file.name}`}
                        size="sm"
                    />

                    <TextField
                        label={`Fecha: ${inspection.manifest.createdAt}`}
                        size="sm"
                    />

                    <TextField
                        label={`Archivos incluidos: ${inspection.fileCount}`}
                        size="sm"
                    />

                    <View style={styles.warning}>
                        <TriangleAlert
                            size={20}
                            color={C.gray}
                        />

                        <View style={{ flex: 1 }}>
                            <TextField
                                label="Restaurar sustituirá los datos actuales. La aplicación primero debe verificar la integridad y crear una copia preventiva."
                                size="sm"
                                color="gray"
                            />
                        </View>
                    </View>

                    <Button
                        text="Preparar restauración"
                        onPress={confirmRestore}
                        loading={loading}
                    />
                </View>
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
    hero: {
        padding: 24,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        alignItems: "center",
        gap: 16,
    },
    details: {
        padding: 18,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        gap: 14,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    warning: {
        flexDirection: "row",
        gap: 10,
        padding: 14,
        borderRadius: 12,
        backgroundColor: C.light,
    },
});