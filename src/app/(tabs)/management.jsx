
import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import {
    Building2,
    Wallet,
    CreditCard,
    ChartNoAxesCombined,
    BedDouble,
    Tags,
    SlidersHorizontal,
    DatabaseBackup,
    ShieldCheck,
    Info,
    ChevronRight,
    MapPin,
} from "lucide-react-native";

import TextField from "../../components/ui/TextField";
import ScreenTab from "../../components/ui/ScreenTab";
import { useProfile } from "../../context/ProfileContext";

const C = {
    white: "#ffffff",
    black: "#18181b",
    gray: "#71717a",
    muted: "#a1a1aa",
    border: "#e4e4e7",
    light: "#f4f4f5",
};

const MENU = [
    {
        title: "Operaciones",
        items: [
            {
                id: "cash",
                title: "Caja y movimientos",
                description: "Ingresos, egresos y cierre de caja",
                icon: Wallet,
                route: "/gestion/caja",
            },
            {
                id: "payments",
                title: "Pagos y cobros",
                description: "Historial y métodos de pago",
                icon: CreditCard,
                route: "/gestion/pagos",
            },
            {
                id: "reports",
                title: "Reportes",
                description: "Ocupación, ventas y estadísticas",
                icon: ChartNoAxesCombined,
                route: "/gestion/reportes",
            },
        ],
    },
    {
        title: "Configuración del hotel",
        items: [
            {
                id: "hotel",
                title: "Datos del hotel",
                description: "Información legal y de contacto",
                icon: Building2,
                route: "/gestion/hotel",
            },
            {
                id: "room-types",
                title: "Tipos de habitación",
                description: "Categorías y capacidades",
                icon: BedDouble,
                route: "/gestion/tipos-habitacion",
            },
            {
                id: "rates",
                title: "Tarifas y precios",
                description: "Precios por hora y noche",
                icon: Tags,
                route: "/gestion/tarifas",
            },
            {
                id: "preferences",
                title: "Preferencias operativas",
                description: "Horarios, moneda y recargos",
                icon: SlidersHorizontal,
                route: "/gestion/preferencias",
            },
        ],
    },
    {
        title: "Sistema",
        items: [
            {
                id: "backup",
                title: "Copias de seguridad",
                description: "Exportar y restaurar datos",
                icon: DatabaseBackup,
                route: "/gestion/respaldos",
            },
            {
                id: "license",
                title: "Licencia",
                description: "Estado de activación",
                icon: ShieldCheck,
                route: "/gestion/licencia",
            },
            {
                id: "about",
                title: "Acerca de",
                description: "Información de la aplicación",
                icon: Info,
                route: "/gestion/acerca-de",
            },
        ],
    },
];

function MenuItem({ item, onPress, enabled }) {
    const Icon = item.icon;

    return (
        <Pressable
            disabled={!enabled}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled }}
            style={({ pressed }) => [
                styles.menuItem,
                pressed && enabled && { opacity: 0.65 },
            ]}
        >
            <View style={styles.menuIcon}>
                <Icon size={20} color={C.black} />
            </View>

            <View style={styles.menuContent}>
                <TextField
                    label={item.title}
                    size="sm"
                    weight="semibold"
                />

                <TextField
                    label={item.description}
                    size="xs"
                    color="gray"
                />
            </View>

            {enabled ? (
                <ChevronRight size={19} color={C.gray} />
            ) : (
                <TextField
                    label="Próximamente"
                    size="xs"
                    color="gray"
                    style={styles.comingSoon}
                />
            )}
        </Pressable>
    );
}

function MenuSection({ section, onNavigate, availableRoutes }) {
    return (
        <View style={styles.section}>
            <TextField
                label={section.title}
                size="sm"
                weight="semibold"
                color="gray"
            />

            <View style={styles.menuCard}>
                {section.items.map((item, index) => (
                    <View key={item.id}>
                        <MenuItem
                            item={item}
                            enabled={availableRoutes.includes(item.route)}
                            onPress={() => onNavigate(item.route)}
                        />

                        {index < section.items.length - 1 && (
                            <View style={styles.divider} />
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function ManagementTab() {
    const router = useRouter();
    const { profile } = useProfile();

    // Añade aquí cada ruta cuando hayas creado su pantalla.
    const availableRoutes = [];

    const hotelName =
        profile?.nombreHotel ||
        profile?.name ||
        "Mi establecimiento";

    const location = [
        profile?.distrito,
        profile?.provincia,
        profile?.departamento,
    ].filter(Boolean).join(", ");

    return (
        <ScreenTab>
            <View style={styles.header}>
                <TextField
                    label="Gestión"
                    size="3xl"
                    weight="bold"
                />

                <TextField
                    label="Administra y configura tu establecimiento"
                    size="xs"
                    color="gray"
                />
            </View>

            <View style={styles.hotelCard}>
                <View style={styles.hotelIcon}>
                    <Building2 size={26} color={C.black} />
                </View>

                <View style={styles.hotelInfo}>
                    <TextField
                        label={hotelName}
                        size="lg"
                        weight="semibold"
                    />

                    {location ? (
                        <View style={styles.location}>
                            <MapPin size={14} color={C.gray} />

                            <TextField
                                label={location}
                                size="xs"
                                color="gray"
                                numberOfLines={2}
                                style={{ flex: 1 }}
                            />
                        </View>
                    ) : (
                        <TextField
                            label="Información del establecimiento"
                            size="xs"
                            color="gray"
                        />
                    )}
                </View>
            </View>

            {MENU.map(section => (
                <MenuSection
                    key={section.title}
                    section={section}
                    availableRoutes={availableRoutes}
                    onNavigate={route => router.push(route)}
                />
            ))}

            <View style={styles.footer}>
                <TextField
                    label="Hotel Ándale"
                    size="sm"
                    weight="semibold"
                    color="gray"
                    align="center"
                />

                <TextField
                    label="Desarrollado por ARCANA CORP"
                    size="xs"
                    color="gray"
                    align="center"
                />
            </View>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        gap: 6,
    },

    hotelCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
    },

    hotelIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },

    hotelInfo: {
        flex: 1,
        gap: 5,
    },

    location: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    section: {
        gap: 12,
    },

    menuCard: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        overflow: "hidden",
    },

    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 15,
        minHeight: 76,
    },

    menuIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },

    menuContent: {
        flex: 1,
        gap: 4,
    },

    comingSoon: {
        fontSize: 10,
        maxWidth: 78,
        textAlign: "right",
    },

    divider: {
        height: 1,
        backgroundColor: C.border,
        marginLeft: 68,
    },

    footer: {
        alignItems: "center",
        gap: 5,
        paddingVertical: 20,
    },
});