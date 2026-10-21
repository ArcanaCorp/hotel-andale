import { Pressable, StyleSheet, View } from "react-native";
import TextField from "./ui/TextField";
import { ChevronRight } from "lucide-react-native";
import { tokens } from "../styles/tokens";

export default function MenuItem({ item, onPress, enabled }) {
    
    const Icon = item.icon;

    return (
        <Pressable disabled={!enabled} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled: !enabled }} style={({ pressed }) => [styles.menuItem, pressed && enabled && { opacity: 0.65 }]}>
            <View style={styles.menuIcon}>
                <Icon size={20} color={tokens.colors.black} />
            </View>
            <View style={styles.menuContent}>
                <TextField label={item.title} size="sm" weight="semibold" />
                <TextField label={item.description} size="xs" color="gray" />
            </View>

            {enabled ? (
                <ChevronRight size={19} color={tokens.colors.gray} />
            ) : (
                <TextField label="Próximamente" size="xs" color="gray" style={styles.comingSoon} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: tokens.colors.light,
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
})