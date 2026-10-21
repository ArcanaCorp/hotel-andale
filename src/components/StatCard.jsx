import { StyleSheet, View } from "react-native";
import TextField from "./ui/TextField";
import { tokens } from "../styles/tokens";

export default function StatCard ({ title, value, subtitle, icon: Icon }) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statTop}>
                <TextField label={title} size="xs" color="gray" style={{ flex: 1 }} />
                <Icon size={19} color={tokens.colors.muted} />
            </View>
            <TextField label={String(value)} size="3xl" weight="bold" />
            <TextField label={subtitle} size="xs" color="gray" />
        </View>
    );
}

const styles = StyleSheet.create({
    statCard: {
        width: "48%",
        flexGrow: 1,
        padding: 15,
        backgroundColor: tokens.colors.white,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: 16,
        gap: 9,
    },
    statTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
    },
})