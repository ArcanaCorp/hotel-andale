import { Pressable, StyleSheet, View } from "react-native";
import { STATUS } from "../constants/rooms";
import { tokens } from "../styles/tokens";
import { BedDouble, ChevronRight } from "lucide-react-native";
import TextField from "./ui/TextField";

export default function RoomCard({ room, onPress }) {

    const status = STATUS[room.operational_status] || {
        label: "Sin estado",
        color: tokens.colors.gray,
        background: tokens.colors.light,
    };

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [ styles.roomCard, pressed && { opacity: 0.75 }]}>
            <View style={styles.roomIcon}>
                <BedDouble size={23} color={tokens.colors.black} />
            </View>
            <View style={styles.roomInfo}>
                <TextField label={`Habitación ${room.number}`} size="md" weight="semibold"/>
                <TextField label={[room.room_type, room.floor ? `Piso ${room.floor}` : null].filter(Boolean).join(" · ")} size="xs" color="gray"/>
                <View style={[ styles.statusBadge, { backgroundColor: status.background }]}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]}/>
                    <TextField label={status.label} size="xs" style={{ color: status.color }} weight="medium"/>
                </View>
            </View>
            <ChevronRight size={19} color={tokens.colors.gray} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    roomCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 15,
        backgroundColor: tokens.colors.white,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: 16,
    },
    roomIcon: {
        width: 52,
        height: 52,
        borderRadius: 13,
        backgroundColor: tokens.colors.light,
        alignItems: "center",
        justifyContent: "center",
    },
    roomInfo: {
        flex: 1,
        gap: 5,
    },
    statusBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
})