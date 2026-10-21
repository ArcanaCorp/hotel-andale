import { View, StyleSheet } from "react-native";
import TextField from "./TextField";
import { tokens } from "../../styles/tokens";

const { palette, colors, spacing, radius, iconSize } = tokens;

const variants = {
    default: {
        background: palette.gray[100],
        color: palette.gray[700],
        border: "transparent"
    },
    primary: {
        background: palette.amaranth[50],
        color: palette.amaranth[700],
        border: "transparent"
    },
    success: {
        background: palette.green[50],
        color: palette.green[700],
        border: "transparent"
    },
    warning: {
        background: palette.yellow[50],
        color: palette.yellow[700],
        border: "transparent"
    },
    danger: {
        background: palette.red[50],
        color: palette.red[700],
        border: "transparent"
    },
    info: {
        background: palette.blue[50],
        color: palette.blue[700],
        border: "transparent"
    },
    outline: {
        background: "transparent",
        color: colors.black,
        border: colors.border
    }
};

const sizes = {
    sm: {
        paddingHorizontal: spacing[2],
        paddingVertical: 3,
        fontSize: "xs",
        iconSize: iconSize.xs,
        gap: 4
    },
    md: {
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        fontSize: "sm",
        iconSize: iconSize.sm,
        gap: spacing[1]
    },
    lg: {
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        fontSize: "md",
        iconSize: iconSize.md,
        gap: spacing[2]
    }
};

export default function Badge({
    text,
    children,
    icon: Icon,
    rightIcon: RightIcon,
    variant = "default",
    size = "md",
    backgroundColor,
    textColor,
    borderColor,
    iconColor,
    rounded = "full",
    outlined = false,
    disabled = false,
    weight = "medium",
    style,
    textStyle,
    ...props
}) {
    const appearance = variants[variant] ?? variants.default;
    const dimensions = sizes[size] ?? sizes.md;

    const foreground = textColor ?? appearance.color;

    return (
        <View
            {...props}
            style={[
                styles.container,
                {
                    backgroundColor:
                        backgroundColor ?? appearance.background,
                    borderColor:
                        borderColor ?? appearance.border,
                    borderWidth:
                        outlined || variant === "outline"
                            ? tokens.borderWidth.thin
                            : 0,
                    borderRadius:
                        tokens.radius[rounded] ?? tokens.radius.full,
                    paddingHorizontal: dimensions.paddingHorizontal,
                    paddingVertical: dimensions.paddingVertical,
                    gap: dimensions.gap,
                    opacity: disabled ? tokens.opacity.disabled : 1
                },
                style
            ]}
        >
            {Icon && (
                <Icon
                    size={dimensions.iconSize}
                    color={iconColor ?? foreground}
                />
            )}

            <TextField
                size={dimensions.fontSize}
                weight={weight}
                color={foreground}
                style={textStyle}
            >
                {children ?? text}
            </TextField>

            {RightIcon && (
                <RightIcon
                    size={dimensions.iconSize}
                    color={iconColor ?? foreground}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        justifyContent: "center"
    }
});