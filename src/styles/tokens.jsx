const amaranth = {
    50: "#ffeff2",
    100: "#ffe0e5",
    200: "#ffc6d3",
    300: "#ff97ae",
    400: "#ff5d85",
    500: "#ff2560",
    600: "#f90150",
    700: "#d7004a",
    800: "#b30043",
    900: "#99023f",
    950: "#560021",
};


const gray = {
    0: "#FFFFFF",
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#E8E8E8",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#888888",
    600: "#666666",
    700: "#444444",
    800: "#292929",
    900: "#181818",
    950: "#0A0A0A",
};

const green = {
    50: "#F0FDF4",
    100: "#DCFCE7",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
};


const yellow = {
    50: "#FFFBEB",
    100: "#FEF3C7",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
};


const red = {
    50: "#FEF2F2",
    100: "#FEE2E2",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
};


const blue = {
    50: "#EFF6FF",
    100: "#DBEAFE",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
};


export const tokens = {

    // =====================================
    // COLOR PALETTES
    // =====================================

    palette: {
        amaranth,
        gray,
        green,
        yellow,
        red,
        blue,
    },


    // =====================================
    // COLORS
    // =====================================

    colors: {

        primary: amaranth[600],

        white: "#FFFFFF",
        black: "#181818",

        gray: "#888888",

        border: "#E8E8E8",
    },


    // =====================================
    // FONT SIZE
    // =====================================

    fontSize: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        "2xl": 20,
        "3xl": 24,
        "4xl": 28,
        "5xl": 32,
        "6xl": 40,
    },

    // =====================================
    // FONT FAMILY
    // =====================================

    fontWeight: {
        light: "Poppins-Light",
        regular: "Poppins-Regular",
        medium: "Poppins-Medium",
        semibold: "Poppins-SemiBold",
        bold: "Poppins-Bold",
    },

    // =====================================
    // SPACING
    // =====================================

    spacing: {
        0: 0,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        8: 32,
        10: 40,
        12: 48,
        16: 64,
        20: 80,
    },


    // =====================================
    // BORDER RADIUS
    // =====================================

    radius: {
        none: 0,
        xs: 4,
        sm: 6,
        md: 10,
        lg: 14,
        xl: 20,
        "2xl": 24,
        "3xl": 32,
        full: 999,
    },


    // =====================================
    // BORDER WIDTH
    // =====================================

    borderWidth: {
        none: 0,
        hairline: 0.5,
        thin: 1,
        medium: 1.5,
        thick: 2,
    },


    // =====================================
    // ICON SIZE
    // =====================================

    iconSize: {
        xs: 14,
        sm: 16,
        md: 20,
        lg: 24,
        xl: 28,
        "2xl": 32,
        "3xl": 40,
    },


    // =====================================
    // COMPONENT HEIGHTS
    // =====================================

    size: {
        inputSm: 40,
        inputMd: 48,
        inputLg: 56,

        buttonSm: 36,
        buttonMd: 46,
        buttonLg: 56,

        touch: 44,

        header: 60,
        tabBar: 64,

        avatarSm: 32,
        avatarMd: 40,
        avatarLg: 56,
    },


    // =====================================
    // OPACITY
    // =====================================

    opacity: {
        disabled: 0.5,
        pressed: 0.75,
        muted: 0.6,
        overlay: 0.45,
    },

};