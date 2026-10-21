import { Modal, StyleSheet, View } from "react-native";

export default function ModalApp ({ visible, onClose }) {
    return (
        <Modal animationType="fade" transparent={true} visible={visible}>
            <View style={styles.overlay}>
                {}
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
})