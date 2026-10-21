
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

import {
    useFocusEffect,
    useRouter,
} from "expo-router";

import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    Wallet,
    BedDouble,
    CalendarCheck,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    BarChart3,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    getHotelReport,
} from "../../database/repositories/reports.repository";

const C = tokens.colors;

const PERIODS = [
    { value: "TODAY", label: "Hoy" },
    { value: "WEEK", label: "Esta semana" },
    { value: "MONTH", label: "Este mes" },
    { value: "YEAR", label: "Este año" },
];

const METHODS = {
    CASH: "Efectivo",
    YAPE: "Yape",
    PLIN: "Plin",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
    OTHER: "Otros",
};

const money = value =>
    `S/ ${(Number(value || 0) / 100).toFixed(2)}`;

function Metric({ icon: Icon, title, value }) {
    return (
        <View style={styles.metric}>
            <Icon size={21} color={C.primary} />

            <TextField
                label={title}
                size="xs"
                color="gray"
            />

            <TextField
                label={value}
                size="lg"
                weight="bold"
            />
        </View>
    );
}

function ProgressRow({ label, value, max, suffix = "" }) {
    const percentage =
        max > 0
            ? Math.min(100, Math.max(0, value / max * 100))
            : 0;

    return (
        <View style={styles.progressItem}>
            <View style={styles.between}>
                <TextField label={label} size="sm" />

                <TextField
                    label={suffix || String(value)}
                    size="sm"
                    weight="semibold"
                />
            </View>

            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        { width: `${percentage}%` },
                    ]}
                />
            </View>
        </View>
    );
}

export default function ReportsScreen() {
    const router = useRouter();

    const [period, setPeriod] = useState("MONTH");
    const [filterSheet, setFilterSheet] = useState(false);
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const result = await getHotelReport(period);
            setReport(result);
        } catch (error) {
            Alert.alert(
                "Error al cargar reportes",
                error?.message ||
                    "No se pudieron obtener los datos."
            );
        } finally {
            setLoading(false);
        }
    }, [period]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const selectedPeriod = PERIODS.find(
        item => item.value === period
    );

    const maxMethod = Math.max(
        0,
        ...(report?.byMethod || []).map(
            item => Math.max(0, item.amount)
        )
    );

    const maxRoom = Math.max(
        0,
        ...(report?.topRooms || []).map(
            item => item.stays
        )
    );

    return (
        <ScreenTab>
            <View style={styles.header}>
                <Button
                    icon={ArrowLeft}
                    iconOnly
                    variant="ghost"
                    onPress={() => router.back()}
                />

                <View style={{ flex: 1, gap: 3 }}>
                    <TextField
                        label="Reportes"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label="Estadísticas del hotel"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <Pressable
                style={styles.filter}
                onPress={() => setFilterSheet(true)}
            >
                <CalendarDays size={19} color={C.primary} />

                <TextField
                    label={selectedPeriod?.label || "Período"}
                    size="sm"
                    weight="medium"
                />

                <ChevronDown size={18} color={C.gray} />
            </Pressable>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator
                        size="large"
                        color={C.primary}
                    />
                    <TextField
                        label="Calculando reportes..."
                        size="sm"
                        color="gray"
                    />
                </View>
            ) : report ? (
                <>
                    <View style={styles.metrics}>
                        <Metric
                            icon={Wallet}
                            title="Cobros netos"
                            value={money(report.paymentsTotal)}
                        />

                        <Metric
                            icon={BedDouble}
                            title="Ocupación temporal"
                            value={`${report.occupancy.toFixed(1)}%`}
                        />

                        <Metric
                            icon={CalendarCheck}
                            title="Reservas creadas"
                            value={String(
                                report.reservationsCount
                            )}
                        />

                        <Metric
                            icon={CheckCircle2}
                            title="Estadías completadas"
                            value={String(
                                report.completedStays
                            )}
                        />
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Resumen financiero"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <TrendingUp
                                    size={19}
                                    color="#16a34a"
                                />
                                <View style={{ flex: 1 }}>
                                    <TextField
                                        label="Cobros netos"
                                        size="sm"
                                    />
                                </View>
                                <TextField
                                    label={money(
                                        report.paymentsTotal
                                    )}
                                    size="sm"
                                    weight="semibold"
                                />
                            </View>

                            <View style={styles.summaryRow}>
                                <TrendingUp
                                    size={19}
                                    color="#16a34a"
                                />
                                <View style={{ flex: 1 }}>
                                    <TextField
                                        label="Otros ingresos"
                                        size="sm"
                                    />
                                </View>
                                <TextField
                                    label={money(
                                        report.manualIncome
                                    )}
                                    size="sm"
                                    weight="semibold"
                                />
                            </View>

                            <View style={styles.summaryRow}>
                                <TrendingDown
                                    size={19}
                                    color="#dc2626"
                                />
                                <View style={{ flex: 1 }}>
                                    <TextField
                                        label="Egresos manuales"
                                        size="sm"
                                    />
                                </View>
                                <TextField
                                    label={money(
                                        report.manualExpense
                                    )}
                                    size="sm"
                                    weight="semibold"
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.between}>
                                <TextField
                                    label="Flujo neto registrado"
                                    size="sm"
                                    weight="bold"
                                />
                                <TextField
                                    label={money(
                                        report.netCashFlow
                                    )}
                                    size="lg"
                                    weight="bold"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Métodos de pago"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.chartCard}>
                            {report.byMethod.length === 0 ? (
                                <TextField
                                    label="No hay cobros en este período."
                                    size="sm"
                                    color="gray"
                                />
                            ) : (
                                report.byMethod.map(item => (
                                    <ProgressRow
                                        key={item.method}
                                        label={
                                            METHODS[item.method] ||
                                            item.method
                                        }
                                        value={Math.max(
                                            0,
                                            item.amount
                                        )}
                                        max={maxMethod}
                                        suffix={money(item.amount)}
                                    />
                                ))
                            )}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label="Reservas y hospedajes"
                            size="lg"
                            weight="bold"
                        />

                        <View style={styles.summaryCard}>
                            <View style={styles.between}>
                                <TextField
                                    label="Reservas canceladas"
                                    size="sm"
                                />
                                <TextField
                                    label={String(
                                        report.cancelledCount
                                    )}
                                    size="sm"
                                    weight="semibold"
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.between}>
                                <TextField
                                    label="Estadías activas"
                                    size="sm"
                                />
                                <TextField
                                    label={String(
                                        report.activeStays
                                    )}
                                    size="sm"
                                    weight="semibold"
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.between}>
                                <TextField
                                    label="Habitaciones activas"
                                    size="sm"
                                />
                                <TextField
                                    label={String(
                                        report.roomCount
                                    )}
                                    size="sm"
                                    weight="semibold"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionTitle}>
                            <BarChart3
                                size={20}
                                color={C.primary}
                            />
                            <TextField
                                label="Habitaciones más utilizadas"
                                size="lg"
                                weight="bold"
                            />
                        </View>

                        <View style={styles.chartCard}>
                            {report.topRooms.length === 0 ? (
                                <TextField
                                    label="No hay estadías en este período."
                                    size="sm"
                                    color="gray"
                                />
                            ) : (
                                report.topRooms.map(item => (
                                    <ProgressRow
                                        key={item.id}
                                        label={`Habitación ${item.number}`}
                                        value={item.stays}
                                        max={maxRoom}
                                        suffix={`${item.stays} estadías`}
                                    />
                                ))
                            )}
                        </View>
                    </View>
                </>
            ) : (
                <TextField
                    label="No se pudieron cargar los reportes."
                    size="sm"
                    color="gray"
                />
            )}

            <BottomSheet
                visible={filterSheet}
                title="Seleccionar período"
                onClose={() => setFilterSheet(false)}
            >
                <View style={styles.sheet}>
                    {PERIODS.map(item => (
                        <Pressable
                            key={item.value}
                            style={[
                                styles.periodOption,
                                period === item.value &&
                                    styles.periodSelected,
                            ]}
                            onPress={() => {
                                setPeriod(item.value);
                                setFilterSheet(false);
                            }}
                        >
                            <TextField
                                label={item.label}
                                size="sm"
                                weight={
                                    period === item.value
                                        ? "semibold"
                                        : "regular"
                                }
                            />
                        </Pressable>
                    ))}
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
    filter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
    },
    loading: {
        paddingVertical: 60,
        alignItems: "center",
        gap: 12,
    },
    metrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    metric: {
        width: "48%",
        flexGrow: 1,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 15,
        gap: 10,
    },
    section: {
        gap: 14,
    },
    sectionTitle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    summaryCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 16,
        gap: 15,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    between: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
    },
    chartCard: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 16,
        gap: 18,
    },
    progressItem: {
        gap: 8,
    },
    track: {
        height: 8,
        borderRadius: 8,
        backgroundColor: C.light,
        overflow: "hidden",
    },
    fill: {
        height: "100%",
        backgroundColor: C.primary,
        borderRadius: 8,
    },
    sheet: {
        gap: 10,
        paddingBottom: 20,
    },
    periodOption: {
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
    },
    periodSelected: {
        borderColor: C.primary,
        backgroundColor: C.light,
    },
});