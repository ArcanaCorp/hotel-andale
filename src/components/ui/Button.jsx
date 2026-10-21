
import {
    Pressable,
    ActivityIndicator,
    StyleSheet,
    View
} from "react-native";

import TextField from "./TextField";
import { tokens } from "../../styles/tokens";

const { palette, colors, opacity } = tokens;

const variants = {
    primary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        textColor: colors.white
    },

    secondary: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        textColor: colors.black
    },

    ghost: {
        backgroundColor: "transparent",
        borderColor: "transparent",
        textColor: colors.black
    },

    link: {
        backgroundColor: "transparent",
        borderColor: "transparent",
        textColor: colors.primary
    },

    danger: {
        backgroundColor: palette.red[600],
        borderColor: palette.red[600],
        textColor: colors.white
    }
};

const sizes = {
    sm: {
        height: tokens.size.buttonSm,
        paddingHorizontal: tokens.spacing[3],
        fontSize: "sm",
        iconSize: tokens.iconSize.xs
    },

    md: {
        height: tokens.size.buttonMd,
        paddingHorizontal: tokens.spacing[4],
        fontSize: "md",
        iconSize: tokens.iconSize.sm
    },

    lg: {
        height: tokens.size.buttonLg,
        paddingHorizontal: tokens.spacing[5],
        fontSize: "md",
        iconSize: tokens.iconSize.md
    }
};

export default function Button({
    text,
    children,
    onPress,
    variant = "primary",
    textColor,
    size: buttonSize = "md",
    icon: Icon,
    rightIcon: RightIcon,
    iconOnly = false,
    loading = false,
    disabled = false,
    fullWidth = true,
    radius: buttonRadius = "lg",
    style,
    textStyle,
    iconColor,
    accessibilityLabel,
    ...props
}) {
    const appearance = variants[variant] ?? variants.primary;
    const dimensions = sizes[buttonSize] ?? sizes.md;

    const isDisabled = disabled || loading;
    const isLink = variant === "link" && !iconOnly;

    const foreground = iconColor ?? appearance.textColor;

    const squareSize = dimensions.height;

    return (
        <Pressable
            {...props}
            accessibilityRole="button"
            accessibilityLabel={
                accessibilityLabel ??
                (typeof text === "string" ? text : undefined)
            }
            accessibilityState={{
                disabled: isDisabled,
                busy: loading
            }}
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.button,
                {
                    width: iconOnly ? squareSize : undefined,
                    height: iconOnly ? squareSize : undefined,

                    minHeight:
                        iconOnly
                            ? undefined
                            : isLink
                                ? undefined
                                : dimensions.height,

                    paddingHorizontal:
                        iconOnly || isLink
                            ? 0
                            : dimensions.paddingHorizontal,

                    paddingVertical: 0,

                    backgroundColor: appearance.backgroundColor,
                    borderColor: appearance.borderColor,

                    borderWidth: isLink
                        ? 0
                        : tokens.borderWidth.thin,

                    borderRadius: isLink
                        ? 0
                        : tokens.radius[buttonRadius] ??
                          tokens.radius.lg,

                    alignSelf: iconOnly
                        ? "flex-start"
                        : isLink
                            ? "flex-start"
                            : fullWidth
                                ? "stretch"
                                : "flex-start",

                    opacity: isDisabled
                        ? opacity.disabled
                        : pressed
                            ? opacity.pressed
                            : 1
                },

                style,

                // Garantiza el cuadrado incluso con estilos externos.
                iconOnly && {
                    width: squareSize,
                    height: squareSize,
                    minWidth: squareSize,
                    minHeight: squareSize,
                    maxWidth: squareSize,
                    maxHeight: squareSize,
                    padding: 0,
                    alignItems: "center",
                    justifyContent: "center"
                }
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    color={foreground}
                    size="small"
                />
            ) : iconOnly ? (
                Icon ? (
                    <Icon
                        size={dimensions.iconSize}
                        color={foreground}
                    />
                ) : null
            ) : (
                <View style={styles.content}>
                    {Icon && (
                        <Icon
                            size={dimensions.iconSize}
                            color={foreground}
                        />
                    )}

                    <TextField
                        size={dimensions.fontSize}
                        weight="semibold"
                        color={textColor ?? appearance.textColor}
                        style={[styles.label, textStyle]}
                    >
                        {children ?? text}
                    </TextField>

                    {RightIcon && (
                        <RightIcon
                            size={dimensions.iconSize}
                            color={foreground}
                        />
                    )}
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        justifyContent: "center"
    },

    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: tokens.spacing[2]
    },

    label: {
        flexShrink: 1,
        textAlign: "center"
    }
});