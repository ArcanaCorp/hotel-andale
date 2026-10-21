import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function ScreenTab ({ children }) {
    return (
        <>
            <StatusBar barStyle={'dark-content'} backgroundColor={'#FFFFFF'} />
            <SafeAreaView style={styles.screen}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {children}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#fafafa",
    },
    content: {
        width: "100%",
        maxWidth: 600,
        alignSelf: "center",
        padding: 24,
        paddingBottom: 60,
        gap: 20,
    },
})