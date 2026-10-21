import { BedDouble, Bell, Building2, ChartNoAxesCombined, CreditCard, DatabaseBackup, Info, ShieldCheck, SlidersHorizontal, Tags, Wallet } from "lucide-react-native";

export const MENU = [
    {
        title: "Operaciones",
        items: [
            {
                id: "cash",
                title: "Caja y movimientos",
                description: "Ingresos, egresos y cierre de caja",
                icon: Wallet,
                route: "/management/cash",
            },
            {
                id: "payments",
                title: "Pagos y cobros",
                description: "Historial y métodos de pago",
                icon: CreditCard,
                route: "/management/payments",
            },
            {
                id: "reports",
                title: "Reportes",
                description: "Ocupación, ventas y estadísticas",
                icon: ChartNoAxesCombined,
                route: "/management/reports",
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
                route: "/management/hotel",
            },
            {
                id: "room-types",
                title: "Tipos de habitación",
                description: "Categorías y capacidades",
                icon: BedDouble,
                route: "/management/room-types",
            },
            {
                id: "rates",
                title: "Tarifas y precios",
                description: "Precios por hora y noche",
                icon: Tags,
                route: "/management/rates",
            },
            {
                id: "preferences",
                title: "Preferencias operativas",
                description: "Horarios, moneda y recargos",
                icon: SlidersHorizontal,
                route: "/management/preferences",
            },
        ],
    },
    {
        title: "Sistema",
        items: [
            {
                id: "notify",
                title: "Notificaciones",
                description: "No te pierdas de nada",
                icon: Bell,
                route: "/management/notifications",
            },
            {
                id: "backup",
                title: "Copias de seguridad",
                description: "Exportar y restaurar datos",
                icon: DatabaseBackup,
                route: "/management/backups",
            },
            {
                id: "license",
                title: "Licencia",
                description: "Estado de activación",
                icon: ShieldCheck,
                route: "/management/license",
            },
            {
                id: "about",
                title: "Acerca de",
                description: "Información de la aplicación",
                icon: Info,
                route: "/management/about",
            },
        ],
    },
];