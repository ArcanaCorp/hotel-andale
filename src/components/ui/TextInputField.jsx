import { StyleSheet, TextInput } from "react-native";

export default function TextInputField({ value, onChangeText, editable }) {
    return (
        <TextInput
            style={styles.input}
            placeholder="HA1..."
            placeholderTextColor="#a1a1aa"
            value={value}
            onChangeText={onChangeText}
            editable={editable}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            maxLength={1024}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#18181b",
        paddingVertical: 12,
        maxHeight: 120,
    },
})