import { Pressable, StyleSheet } from "react-native"
import { tokens } from "../../styles/tokens"
import TextField from "./TextField"

export default function FilterChip ({ item, selected, setFilter }) {
    return (
        <Pressable onPress={() => setFilter(item.key)} style={[styles.filterChip, selected && styles.filterActive]}>
            <TextField label={item.label} size="xs" weight={selected ? "semibold" : "medium"} style={{color: selected ? tokens.colors.white : tokens.colors.gray}}/>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    filterChip: {
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        backgroundColor: tokens.colors.white,
        marginRight: 8
    },
    filterActive: {
        backgroundColor: tokens.colors.black,
        borderColor: tokens.colors.black,
    },
})