import { StyleSheet, View } from "react-native";
import TextField from "./ui/TextField";
import { tokens } from "../styles/tokens";

export default function SummaryCard({ label, value, Icon }) {
    return (
        <View style={styles.summaryCard}>
            <Icon size={19} color={tokens.colors.gray} />
            <TextField label={String(value)} size="2xl" weight="bold"/>
            <TextField label={label} size="xs" color="gray"/>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: tokens.colors.white,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: 14,
        padding: 12,
        gap: 7,
    },
})