import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, ToastAndroid, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BedDouble, CalendarDays, CalendarPlus, ChevronRight, DoorClosed, LogOut, RefreshCw, Wallet, WifiOff } from "lucide-react-native";
import TextField from "../../components/ui/TextField";
import ScreenTab from "../../components/ui/ScreenTab";
import { useProfile } from "../../context/ProfileContext";
import { getDashboardSummary } from "../../services/dashboard.service";
import Button from "../../components/ui/Button";
import StatCard from "../../components/StatCard";

const COLORS = {
    background: "#fafafa",
    white: "#ffffff",
    text: "#18181b",
    muted: "#71717a",
    border: "#e4e4e7",
    light: "#f4f4f5",
    green: "#15803d",
    orange: "#c2410c",
};

function QuickAction({ title, icon: Icon, onPress }) {
    return (
        <Pressable onPress={onPress} style={styles.action}>
            <View style={styles.actionIcon}>
                <Icon size={22} color={COLORS.text} />
            </View>
            <TextField label={title} size="xs" weight="medium" align="center" />
        </Pressable>
    );
}

function DepartureItem({ item }) {
    const date = new Date(item.scheduled_check_out_at);

    const dateLabel = Number.isNaN(date.getTime())
        ? "Fecha no disponible"
        : date.toLocaleString("es-PE", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <View style={styles.departureItem}>
            <View style={styles.roomBadge}>
                <BedDouble size={19} color={COLORS.text} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
                <TextField label={`Habitación ${item.room_number}`} size="sm" weight="semibold" />
                <TextField label={`${item.first_name} ${item.last_name}`} size="xs" color="gray" />
                <TextField label={`Salida: ${dateLabel}`} size="xs" color="gray" />
            </View>
        </View>
    );
}

export default function IndexTab() {
    const router = useRouter();
    const { profile } = useProfile();

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getDashboardSummary();
            setDashboard(data);
            ToastAndroid.showWithGravity('Se actualizó la información', ToastAndroid.CENTER, ToastAndroid.SHORT)
        } catch (err) {
            setError(err?.message || "No se pudo cargar el resumen.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Actualiza los datos al volver a Inicio.
    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [loadDashboard])
    );

    const currency = profile?.currency || "PEN";

    const money = (cents) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency,
        }).format(cents / 100);

    const rooms = dashboard?.rooms;
    const departures = dashboard?.departures || [];

    return (
        <ScreenTab>
            <View style={styles.header}>
                <View style={{ flex: 1, gap: 5 }}>
                    <TextField label="Bienvenido" size="md" color="gray" />
                    <TextField label={profile?.nombreHotel || profile?.name || "Mi establecimiento"} size="3xl" weight="bold" />
                    <TextField label="Resumen de operaciones" size="xs" color="gray" />
                </View>
                <Button icon={RefreshCw} iconOnly={true} variant="ghost" size="md" accessibilityLabel="Actualizar" loading={loading} disabled={loading} onPress={loadDashboard} />
            </View>
            <View style={styles.offlineBanner}>
                <WifiOff size={17} color={COLORS.muted} />
                <TextField label="Información almacenada en este dispositivo" size="xs" color="gray" style={{ flex: 1 }} />
            </View>

            {loading && !dashboard ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={COLORS.text} />
                    <TextField label="Cargando operaciones..." size="sm" color="gray" />
                </View>
            ) : error && !dashboard ? (
                <View style={styles.empty}>
                    <TextField label="No se pudo cargar el inicio" size="md" weight="semibold" />
                    <TextField label={error} size="xs" color="gray" align="center" />
                    <Button icon={RefreshCw} text={'Reintentar'} variant="secondary" onPress={loadDashboard} />
                </View>
            ) : (
                <>
                    <View style={styles.sectionHeader}>
                        <TextField label="Estado del hotel" size="lg" weight="semibold"/>
                    </View>

                    <View style={styles.statsGrid}>
                        <StatCard title="Disponibles" value={rooms?.available ?? 0} subtitle="Habitaciones libres" icon={BedDouble}/>
                        <StatCard title="Ocupadas" value={rooms?.occupied ?? 0} subtitle="Habitaciones en uso" icon={DoorClosed}/>
                        <StatCard title="Ingresos de hoy" value={money(dashboard?.incomeCents ?? 0)} subtitle="Pagos netos" icon={Wallet} />
                        <StatCard title="Salidas pendientes" value={departures.length} subtitle="Hasta el final de hoy" icon={LogOut} />
                    </View>

                    <View style={styles.sectionHeader}>
                        <TextField label="Accesos rápidos" size="lg" weight="semibold" />
                    </View>

                    <View style={styles.actionsGrid}>
                        <QuickAction title="Check-in" icon={DoorClosed} onPress={() => router.push("/rooms")} />
                        <QuickAction title="Reservar" icon={CalendarPlus} onPress={() => router.push("/bookings")} />
                        <QuickAction title="Habitaciones" icon={BedDouble} onPress={() => router.push("/rooms")} />
                        <QuickAction title="Cobros" icon={Wallet} onPress={() => router.push("/management")} />
                    </View>

                    <View style={styles.sectionHeader}>
                        <TextField label="Próximas salidas" size="lg" weight="semibold"/>
                        <Button text={'Ver'} rightIcon={ChevronRight} variant="link" size="sm" onPress={() => router.push("/rooms")}/>
                    </View>

                    {departures.length === 0 ? (
                        <View style={styles.empty}>
                            <CalendarDays size={28} color={COLORS.muted}/>
                            <TextField label="Sin salidas pendientes" size="sm" weight="semibold"/>
                            <TextField label="Las salidas programadas aparecerán aquí." size="xs" color="gray" align="center"/>
                        </View>
                    ) : (
                        <View style={styles.departuresCard}>
                            {departures.map((item) => (
                                <DepartureItem key={item.id} item={item} />
                            ))}
                        </View>
                    )}

                    {rooms?.total === 0 && (
                        <Pressable style={styles.setupBanner} onPress={() => router.push("/rooms")}>
                            <View style={{ flex: 1, gap: 4 }}>
                                <TextField label="Configura tus habitaciones" size="sm" weight="semibold" />
                                <TextField label="Registra tus habitaciones para comenzar a operar." size="xs" color="gray" />
                            </View>
                            <ChevronRight size={20} color={COLORS.text} />
                        </Pressable>
                    )}
                </>
            )}
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 48,
        gap: 22,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        justifyContent: 'center'
    },
    refreshButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: COLORS.light,
        alignItems: "center",
        justifyContent: "center",
    },
    offlineBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: COLORS.light,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    statCard: {
        width: "48%",
        flexGrow: 1,
        padding: 15,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        gap: 9,
    },
    statTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
    },
    actionsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    action: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    actionIcon: {
        width: 54,
        height: 54,
        borderRadius: 15,
        backgroundColor: COLORS.light,
        alignItems: "center",
        justifyContent: "center",
    },
    seeAll: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    departuresCard: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        paddingHorizontal: 16,
    },
    departureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 15,
    },
    roomBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.light,
        alignItems: "center",
        justifyContent: "center",
    },
    empty: {
        padding: 28,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        alignItems: "center",
        gap: 10,
    },
    loading: {
        padding: 48,
        alignItems: "center",
        gap: 14,
    },
    setupBanner: {
        flexDirection: "row",
        alignItems: "center",
        padding: 18,
        backgroundColor: COLORS.light,
        borderRadius: 16,
        gap: 12,
    },
});