import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { X } from "lucide-react-native";
import TextField from "./TextField";
import Button from "./Button";

export default function BottomSheet({ visible, title, onClose, children, busy = false }) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => {
                if (!busy) onClose();
            }}
        >
            <KeyboardAvoidingView
                style={styles.root}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <Pressable
                    style={styles.overlay}
                    onPress={() => {
                        if (!busy) onClose();
                    }}
                />

                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <TextField
                                label={title}
                                size="lg"
                                weight="bold"
                            />
                        </View>

                        <Button
                            icon={X}
                            iconOnly
                            variant="ghost"
                            disabled={busy}
                            onPress={onClose}
                        />
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.content}
                    >
                        {children}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: "flex-end",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 32,
        maxHeight: "85%",
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 3,
        backgroundColor: "#d4d4d8",
        alignSelf: "center",
        marginBottom: 18,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    content: {
        gap: 12,
        paddingBottom: 12,
    },
});