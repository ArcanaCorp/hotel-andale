
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ArrowLeft,
    Bell,
    BellOff,
    CheckCheck,
    ChevronRight,
    Clock3,
    CalendarClock,
    BedDouble,
    Wallet,
    ShieldCheck,
    Settings2,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import { tokens } from "../../styles/tokens";

import {
    getNotificationSettings,
    updateNotificationSettings,
    listLocalNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "../../database/repositories/notifications.repository";

import {
    initializeLocalNotifications,
} from "../../services/notifications.service";

const C = tokens.colors;

const OPTIONS = [
    {
        key: "checkout_alerts",
        title: "Check-out",
        description: "Salidas próximas y vencidas",
        icon: Clock3,
    },
    {
        key: "reservation_alerts",
        title: "Reservas",
        description: "Ingresos próximos y pendientes",
        icon: CalendarClock,
    },
    {
        key: "room_alerts",
        title: "Habitaciones",
        description: "Limpieza y mantenimiento",
        icon: BedDouble,
    },
    {
        key: "cash_alerts",
        title: "Caja",
        description: "Recordatorios de cierre",
        icon: Wallet,
    },
    {
        key: "license_alerts",
        title: "Licencia",
        description: "Avisos de vencimiento",
        icon: ShieldCheck,
    },
];

const CATEGORY_ICONS = {
    CHECKOUT: Clock3,
    RESERVATION: CalendarClock,
    ROOM: BedDouble,
    CASH: Wallet,
    LICENSE: ShieldCheck,
};

function dateLabel(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function NotificationsScreen() {
    const router = useRouter();

    const [settings, setSettings] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const load = useCallback(async () => {
        try {
            const [preferences, notifications] =
                await Promise.all([
                    getNotificationSettings(),
                    listLocalNotifications(),
                ]);

            setSettings(preferences);
            setItems(notifications);
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudieron cargar las notificaciones."
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

    const unread = items.filter(
        item => !item.read_at
    ).length;

    const changeSetting = async (key, value) => {
        if (saving) return;

        setSaving(true);

        try {
            if (key === "enabled" && value) {
                const permission =
                    await initializeLocalNotifications();

                if (!permission) {
                    Alert.alert(
                        "Permiso no concedido",
                        "Los avisos seguirán disponibles dentro de la aplicación, pero no aparecerán como notificaciones del dispositivo."
                    );
                }
            }

            const updated =
                await updateNotificationSettings({
                    [key]: value,
                });

            setSettings(updated);
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudo guardar la preferencia."
            );
        } finally {
            setSaving(false);
        }
    };

    const openNotification = async item => {
        try {
            await markNotificationRead(item.id);
            await load();

            if (item.route) {
                router.push(item.route);
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudo abrir la notificación."
            );
        }
    };

    const markAll = async () => {
        try {
            await markAllNotificationsRead();
            await load();
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudieron actualizar los avisos."
            );
        }
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

                <View style={{ flex: 1, gap: 4 }}>
                    <TextField
                        label="Notificaciones"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label="Avisos del hotel"
                        size="xs"
                        color="gray"
                    />
                </View>

                <Button
                    icon={Settings2}
                    iconOnly
                    variant="ghost"
                    onPress={() => setShowSettings(true)}
                />
            </View>

            <View style={styles.summary}>
                <View style={styles.summaryIcon}>
                    <Bell size={24} color={C.primary} />
                </View>

                <View style={{ flex: 1, gap: 5 }}>
                    <TextField
                        label={`${unread} sin leer`}
                        size="lg"
                        weight="bold"
                    />
                    <TextField
                        label="Centro de avisos operativos"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.between}>
                <TextField
                    label="Avisos recientes"
                    size="lg"
                    weight="bold"
                />

                {unread > 0 && (
                    <Button
                        text="Marcar leídos"
                        icon={CheckCheck}
                        variant="ghost"
                        size="sm"
                        onPress={markAll}
                    />
                )}
            </View>

            {loading ? (
                <View style={styles.empty}>
                    <ActivityIndicator
                        color={C.primary}
                    />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.empty}>
                    <BellOff size={34} color={C.gray} />
                    <TextField
                        label="No tienes notificaciones"
                        size="md"
                        weight="semibold"
                    />
                    <TextField
                        label="Los avisos operativos aparecerán aquí."
                        size="sm"
                        color="gray"
                    />
                </View>
            ) : (
                items.map(item => {
                    const Icon =
                        CATEGORY_ICONS[item.category] ||
                        Bell;

                    return (
                        <Pressable
                            key={item.id}
                            style={[
                                styles.notification,
                                !item.read_at &&
                                    styles.unread,
                            ]}
                            onPress={() =>
                                openNotification(item)
                            }
                        >
                            <View style={styles.itemIcon}>
                                <Icon
                                    size={20}
                                    color={C.primary}
                                />
                            </View>

                            <View style={{
                                flex: 1,
                                gap: 6,
                            }}>
                                <TextField
                                    label={item.title}
                                    size="sm"
                                    weight="semibold"
                                />

                                <TextField
                                    label={item.body}
                                    size="sm"
                                    color="gray"
                                />

                                <TextField
                                    label={dateLabel(
                                        item.scheduled_at ||
                                        item.created_at
                                    )}
                                    size="xs"
                                    color="gray"
                                />
                            </View>

                            {!item.read_at ? (
                                <View style={styles.dot} />
                            ) : (
                                <ChevronRight
                                    size={17}
                                    color={C.gray}
                                />
                            )}
                        </Pressable>
                    );
                })
            )}

            <BottomSheet
                visible={showSettings}
                title="Configurar notificaciones"
                busy={saving}
                onClose={() => setShowSettings(false)}
            >
                <View style={styles.sheet}>
                    <View style={styles.setting}>
                        <View style={{ flex: 1, gap: 5 }}>
                            <TextField
                                label="Notificaciones activas"
                                size="sm"
                                weight="bold"
                            />
                            <TextField
                                label="Permitir alertas operativas"
                                size="xs"
                                color="gray"
                            />
                        </View>

                        <Switch
                            value={settings?.enabled === 1}
                            disabled={saving}
                            onValueChange={value =>
                                changeSetting(
                                    "enabled",
                                    value
                                )
                            }
                            trackColor={{
                                true: C.primary,
                            }}
                        />
                    </View>

                    <View style={styles.divider} />

                    {OPTIONS.map(option => {
                        const Icon = option.icon;

                        return (
                            <View
                                key={option.key}
                                style={styles.setting}
                            >
                                <Icon
                                    size={19}
                                    color={C.primary}
                                />

                                <View style={{
                                    flex: 1,
                                    gap: 5,
                                }}>
                                    <TextField
                                        label={option.title}
                                        size="sm"
                                        weight="medium"
                                    />
                                    <TextField
                                        label={option.description}
                                        size="xs"
                                        color="gray"
                                    />
                                </View>

                                <Switch
                                    value={
                                        settings?.[option.key] === 1
                                    }
                                    disabled={
                                        saving ||
                                        settings?.enabled !== 1
                                    }
                                    onValueChange={value =>
                                        changeSetting(
                                            option.key,
                                            value
                                        )
                                    }
                                    trackColor={{
                                        true: C.primary,
                                    }}
                                />
                            </View>
                        );
                    })}

                    <Button
                        text="Cerrar"
                        variant="secondary"
                        onPress={() =>
                            setShowSettings(false)
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
    between: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summary: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
    },
    summaryIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    notification: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
    },
    unread: {
        borderColor: C.primary,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.primary,
        marginTop: 5,
    },
    empty: {
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 60,
    },
    sheet: {
        gap: 16,
        paddingBottom: 20,
    },
    setting: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
    },
});
