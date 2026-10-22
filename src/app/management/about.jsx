
import {
    Linking,
    Platform,
    StyleSheet,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Application from "expo-application";

import {
    ArrowLeft,
    BedDouble,
    Building2,
    CalendarDays,
    ChartNoAxesCombined,
    Code2,
    Database,
    ShieldCheck,
    Users,
    Wallet,
    WifiOff,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import { tokens } from "../../styles/tokens";

const C = tokens.colors;

const FEATURES = [
    {
        icon: BedDouble,
        title: "Habitaciones y tarifas",
    },
    {
        icon: CalendarDays,
        title: "Reservas y estadías",
    },
    {
        icon: Users,
        title: "Gestión de huéspedes",
    },
    {
        icon: Wallet,
        title: "Caja y pagos",
    },
    {
        icon: ChartNoAxesCombined,
        title: "Reportes del negocio",
    },
    {
        icon: Database,
        title: "Copias de seguridad",
    },
];

function DetailRow({ label, value }) {
    return (
        <View style={styles.detailRow}>
            <TextField
                label={label}
                size="sm"
                color="gray"
            />

            <TextField
                label={value}
                size="sm"
                weight="medium"
            />
        </View>
    );
}

export default function AboutScreen() {
    const router = useRouter();

    const version =
        Application.nativeApplicationVersion ||
        "1.0.0";

    const build =
        Application.nativeBuildVersion || "—";

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
                        label="Acerca de"
                        size="xl"
                        weight="bold"
                    />
                </View>
            </View>

            <View style={styles.hero}>
                <View style={styles.logo}>
                    <Building2
                        size={40}
                        color={C.primary}
                    />
                </View>

                <TextField
                    label="Hotel Ándale"
                    size="xl"
                    weight="bold"
                />

                <TextField
                    label="Gestión hotelera simple e inteligente"
                    size="sm"
                    color="gray"
                />

                <View style={styles.versionBadge}>
                    <TextField
                        label={`Versión ${version}`}
                        size="xs"
                        weight="medium"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <TextField
                    label="La aplicación"
                    size="lg"
                    weight="bold"
                />

                <TextField
                    label="Hotel Ándale es una aplicación para administrar las operaciones diarias de un establecimiento de hospedaje desde un solo lugar."
                    size="sm"
                    color="gray"
                />

                <View style={styles.offlineCard}>
                    <WifiOff
                        size={22}
                        color={C.primary}
                    />

                    <View style={{ flex: 1, gap: 5 }}>
                        <TextField
                            label="Funciona sin internet"
                            size="sm"
                            weight="semibold"
                        />

                        <TextField
                            label="La información se almacena localmente en el dispositivo."
                            size="xs"
                            color="gray"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <TextField
                    label="Características"
                    size="lg"
                    weight="bold"
                />

                {FEATURES.map(item => {
                    const Icon = item.icon;

                    return (
                        <View
                            key={item.title}
                            style={styles.featureRow}
                        >
                            <Icon
                                size={20}
                                color={C.primary}
                            />

                            <View style={{ flex: 1 }}>
                                <TextField
                                    label={item.title}
                                    size="sm"
                                    weight="medium"
                                />
                            </View>
                        </View>
                    );
                })}
            </View>

            <View style={styles.section}>
                <TextField
                    label="Desarrollado por"
                    size="lg"
                    weight="bold"
                />

                <View style={styles.companyCard}>
                    <View style={styles.companyIcon}>
                        <Code2
                            size={26}
                            color={C.primary}
                        />
                    </View>

                    <View style={{
                        flex: 1,
                        gap: 5,
                    }}>
                        <TextField
                            label="ARCANA CORP"
                            size="md"
                            weight="bold"
                        />

                        <TextField
                            label="Tecnología para impulsar negocios"
                            size="xs"
                            color="gray"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <TextField
                    label="Información técnica"
                    size="lg"
                    weight="bold"
                />

                <View style={styles.details}>
                    <DetailRow
                        label="Versión"
                        value={version}
                    />

                    <DetailRow
                        label="Compilación"
                        value={build}
                    />

                    <DetailRow
                        label="Plataforma"
                        value={
                            Platform.OS === "android"
                                ? "Android"
                                : Platform.OS === "ios"
                                    ? "iOS"
                                    : Platform.OS
                        }
                    />

                    <DetailRow
                        label="Almacenamiento"
                        value="SQLite local"
                    />

                    <DetailRow
                        label="Funcionamiento"
                        value="Offline"
                    />
                </View>
            </View>

            <View style={styles.legal}>
                <ShieldCheck
                    size={18}
                    color={C.gray}
                />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="Hotel Ándale es un software desarrollado por ARCANA CORP. Su utilización está sujeta a las condiciones de licencia aplicables."
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.footer}>
                <TextField
                    label="© 2026 ARCANA CORP"
                    size="xs"
                    color="gray"
                />

                <TextField
                    label="Hecho en Perú"
                    size="xs"
                    color="gray"
                />
            </View>
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
        alignItems: "center",
        gap: 10,
        paddingVertical: 24,
    },
    logo: {
        width: 90,
        height: 90,
        borderRadius: 24,
        backgroundColor: C.light,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 6,
    },
    versionBadge: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: C.light,
        borderRadius: 20,
        marginTop: 4,
    },
    section: {
        gap: 14,
    },
    offlineCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 14,
        backgroundColor: C.light,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
    },
    companyCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
    },
    companyIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    details: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 16,
        gap: 18,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    legal: {
        flexDirection: "row",
        gap: 12,
        padding: 16,
        borderRadius: 14,
        backgroundColor: C.light,
    },
    footer: {
        alignItems: "center",
        gap: 6,
        paddingVertical: 16,
    },
});
