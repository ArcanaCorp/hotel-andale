
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ArchiveRestore,
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    DatabaseBackup,
    FileArchive,
    HardDrive,
    MoreVertical,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import { tokens } from "../../styles/tokens";

import {
    createBackup,
    deleteBackup,
    exportBackup,
    getBackupSettings,
    listBackups,
    saveBackupSettings,
} from "../../services/backup.service";

const C = tokens.colors;

const FREQUENCIES = [
    { value: "OFF", label: "Desactivadas" },
    { value: "DAILY", label: "Diariamente" },
    { value: "WEEKLY", label: "Semanalmente" },
    { value: "MONTHLY", label: "Mensualmente" },
];

const RETENTIONS = [3, 7, 15, 30];

function formatDate(value) {
    if (!value) return "Nunca";

    return new Date(value).toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatSize(bytes) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsScreen() {
    const router = useRouter();

    const [backups, setBackups] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [settingsOpen, setSettingsOpen] =
        useState(false);

    const [selectedBackup, setSelectedBackup] =
        useState(null);

    const load = useCallback(async () => {
        try {
            const [files, preferences] =
                await Promise.all([
                    listBackups(),
                    getBackupSettings(),
                ]);

            setBackups(files);
            setSettings(preferences);
        } catch (error) {
            Alert.alert(
                "Error",
                error.message ||
                    "No se pudieron cargar las copias."
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

    const create = async () => {
        if (busy) return;

        setBusy(true);

        try {
            await createBackup();
            await load();

            Alert.alert(
                "Copia creada",
                "La información se guardó correctamente en este dispositivo."
            );
        } catch (error) {
            Alert.alert(
                "Error al crear copia",
                error.message
            );
        } finally {
            setBusy(false);
        }
    };

    const changeSetting = async patch => {
        if (busy) return;

        setBusy(true);

        try {
            const updated =
                await saveBackupSettings(patch);

            setSettings(updated);
        } catch (error) {
            Alert.alert(
                "Error",
                error.message
            );
        } finally {
            setBusy(false);
        }
    };

    const exportSelected = async () => {
        if (!selectedBackup || busy) return;

        const uri = selectedBackup.uri;

        setSelectedBackup(null);

        try {
            await exportBackup(uri);
        } catch (error) {
            Alert.alert(
                "No se pudo exportar",
                error.message
            );
        }
    };

    const confirmDelete = () => {
        if (!selectedBackup || busy) return;

        const uri = selectedBackup.uri;

        setSelectedBackup(null);

        Alert.alert(
            "Eliminar copia",
            "Esta acción eliminará el archivo local seleccionado.",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        setBusy(true);

                        try {
                            await deleteBackup(uri);
                            await load();
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

    const lastBackup = backups[0];

    const frequencyLabel =
        FREQUENCIES.find(
            item => item.value === settings?.frequency
        )?.label || "Sin configurar";

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
                        label="Copias de seguridad"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Respaldo local de información"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator
                    color={C.primary}
                    size="large"
                />
            ) : (
                <>
                    <View style={styles.hero}>
                        <View style={styles.heroIcon}>
                            <DatabaseBackup
                                size={32}
                                color={C.primary}
                            />
                        </View>

                        <TextField
                            label="Última copia de seguridad"
                            size="sm"
                            color="gray"
                        />

                        <TextField
                            label={formatDate(
                                lastBackup?.modifiedAt
                            )}
                            size="xl"
                            weight="bold"
                        />

                        <View style={styles.row}>
                            <HardDrive
                                size={16}
                                color={C.gray}
                            />

                            <TextField
                                label="Almacenamiento local"
                                size="xs"
                                color="gray"
                            />
                        </View>

                        <Button
                            text="Crear copia ahora"
                            icon={DatabaseBackup}
                            loading={busy}
                            disabled={busy}
                            onPress={create}
                        />
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Configuración automática"
                            size="lg"
                            weight="bold"
                        />

                        <Pressable
                            style={styles.settingRow}
                            onPress={() =>
                                setSettingsOpen(true)
                            }
                        >
                            <View style={{
                                flex: 1,
                                gap: 5,
                            }}>
                                <TextField
                                    label="Frecuencia"
                                    size="sm"
                                    weight="medium"
                                />

                                <TextField
                                    label={frequencyLabel}
                                    size="xs"
                                    color="gray"
                                />
                            </View>

                            <ChevronRight
                                size={20}
                                color={C.gray}
                            />
                        </Pressable>

                        <Pressable
                            style={styles.settingRow}
                            onPress={() =>
                                setSettingsOpen(true)
                            }
                        >
                            <View style={{
                                flex: 1,
                                gap: 5,
                            }}>
                                <TextField
                                    label="Conservar copias"
                                    size="sm"
                                    weight="medium"
                                />

                                <TextField
                                    label={`Últimas ${settings?.retention || 7}`}
                                    size="xs"
                                    color="gray"
                                />
                            </View>

                            <ChevronRight
                                size={20}
                                color={C.gray}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.between}>
                            <TextField
                                label="Historial de copias"
                                size="lg"
                                weight="bold"
                            />

                            <TextField
                                label={`${backups.length} archivos`}
                                size="xs"
                                color="gray"
                            />
                        </View>

                        {backups.length === 0 ? (
                            <View style={styles.empty}>
                                <FileArchive
                                    size={30}
                                    color={C.gray}
                                />

                                <TextField
                                    label="Todavía no hay copias"
                                    size="sm"
                                    color="gray"
                                />
                            </View>
                        ) : (
                            backups.map(item => (
                                <Pressable
                                    key={item.uri}
                                    style={styles.backupRow}
                                    onPress={() =>
                                        setSelectedBackup(item)
                                    }
                                >
                                    <View style={styles.fileIcon}>
                                        <FileArchive
                                            size={21}
                                            color={C.primary}
                                        />
                                    </View>

                                    <View style={{
                                        flex: 1,
                                        gap: 5,
                                    }}>
                                        <TextField
                                            label={formatDate(
                                                item.modifiedAt
                                            )}
                                            size="sm"
                                            weight="semibold"
                                        />

                                        <TextField
                                            label={`${formatSize(item.size)} · ZIP local`}
                                            size="xs"
                                            color="gray"
                                        />
                                    </View>

                                    <MoreVertical
                                        size={19}
                                        color={C.gray}
                                    />
                                </Pressable>
                            ))
                        )}
                    </View>

                    <View style={styles.info}>
                        <CheckCircle2
                            size={18}
                            color={C.primary}
                        />

                        <View style={{ flex: 1 }}>
                            <TextField
                                label="Las copias se almacenan en este dispositivo. Exporta una copia a una carpeta externa para conservarla si desinstalas la aplicación."
                                size="xs"
                                color="gray"
                            />
                        </View>
                    </View>
                    
                    <Button
                        text="Restaurar una copia"
                        icon={ArchiveRestore}
                        variant="secondary"
                        onPress={() =>
                            router.push("/management/restore")
                        }
                    />
                </>
            )}

            <BottomSheet
                visible={settingsOpen}
                title="Copias automáticas"
                busy={busy}
                onClose={() => setSettingsOpen(false)}
            >
                <View style={styles.sheet}>
                    <TextField
                        label="Frecuencia"
                        size="md"
                        weight="bold"
                    />

                    {FREQUENCIES.map(option => (
                        <Pressable
                            key={option.value}
                            style={[
                                styles.option,
                                settings?.frequency ===
                                    option.value &&
                                    styles.selected,
                            ]}
                            onPress={() =>
                                changeSetting({
                                    frequency: option.value,
                                })
                            }
                        >
                            <TextField
                                label={option.label}
                                size="sm"
                            />

                            {settings?.frequency ===
                                option.value && (
                                <CheckCircle2
                                    size={19}
                                    color={C.primary}
                                />
                            )}
                        </Pressable>
                    ))}

                    <TextField
                        label="Número de copias conservadas"
                        size="md"
                        weight="bold"
                    />

                    <View style={styles.retentionRow}>
                        {RETENTIONS.map(value => (
                            <Pressable
                                key={value}
                                style={[
                                    styles.retention,
                                    settings?.retention ===
                                        value &&
                                        styles.selected,
                                ]}
                                onPress={() =>
                                    changeSetting({
                                        retention: value,
                                    })
                                }
                            >
                                <TextField
                                    label={String(value)}
                                    size="sm"
                                    weight="medium"
                                />
                            </Pressable>
                        ))}
                    </View>

                    <Button
                        text="Listo"
                        onPress={() =>
                            setSettingsOpen(false)
                        }
                    />
                </View>
            </BottomSheet>

            <BottomSheet
                visible={!!selectedBackup}
                title="Copia de seguridad"
                onClose={() => setSelectedBackup(null)}
            >
                <View style={styles.sheet}>
                    <TextField
                        label={formatDate(
                            selectedBackup?.modifiedAt
                        )}
                        size="md"
                        weight="bold"
                    />

                    <TextField
                        label={
                            selectedBackup
                                ? formatSize(
                                    selectedBackup.size
                                )
                                : ""
                        }
                        size="sm"
                        color="gray"
                    />

                    <Button
                        text="Exportar al teléfono"
                        onPress={exportSelected}
                    />

                    <Button
                        text="Eliminar copia"
                        variant="danger-soft"
                        onPress={confirmDelete}
                    />

                    <Button
                        text="Cancelar"
                        variant="secondary"
                        onPress={() =>
                            setSelectedBackup(null)
                        }
                    />
                </View>
            </BottomSheet>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    between: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    hero: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        padding: 20,
        alignItems: "center",
        gap: 14,
    },
    heroIcon: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    section: {
        gap: 12,
    },
    settingRow: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    backupRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
    },
    fileIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    empty: {
        padding: 30,
        alignItems: "center",
        gap: 12,
    },
    info: {
        flexDirection: "row",
        gap: 10,
        padding: 14,
        borderRadius: 12,
        backgroundColor: C.light,
    },
    sheet: {
        gap: 14,
        paddingBottom: 20,
    },
    option: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    selected: {
        borderColor: C.primary,
        backgroundColor: C.light,
    },
    retentionRow: {
        flexDirection: "row",
        gap: 8,
    },
    retention: {
        flex: 1,
        alignItems: "center",
        padding: 12,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
    },
});