import { BedDouble, ChevronRight, Phone, UserCheck, UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { tokens } from "../styles/tokens";
import TextField from "./ui/TextField";

export default function GuestCard({ guest, onPress }) {

    const fullName = [
        guest.first_name,
        guest.last_name,
    ].filter(Boolean).join(" ");

    const isActive = guest.active_stays > 0;
    const isFrequent = guest.total_stays >= 3;

    const document = [
        guest.document_type,
        guest.document_number,
    ].filter(Boolean).join(": ");

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.guestCard, pressed && { opacity: 0.75 }]}>

            <View style={styles.guestTop}>
                <View style={styles.avatar}>
                    <UserRound size={23} color={tokens.colors.black} />
                </View>

                <View style={styles.guestInfo}>
                    <TextField label={fullName || "Sin nombre"} size="md" weight="semibold"/>
                    <TextField label={document || "Sin documento"} size="xs" color="gray"/>

                    <View style={styles.badges}>
                        {isActive && (
                            <View style={styles.activeBadge}>
                                <View style={styles.activeDot} />
                                <TextField label="Hospedado" size="xs" weight="medium" style={{ color: tokens.colors.green }}/>
                            </View>
                        )}

                        {isFrequent && (
                            <View style={styles.frequentBadge}>
                                <UserCheck
                                    size={12}
                                    color={tokens.colors.black}
                                />

                                <TextField
                                    label="Frecuente"
                                    size="xs"
                                    weight="medium"
                                />
                            </View>
                        )}
                    </View>
                </View>

                <ChevronRight size={19} color={tokens.colors.gray} />
            </View>

            <View style={styles.guestFooter}>
                <View style={styles.footerDetail}>
                    <BedDouble size={15} color={tokens.colors.gray} />

                    <TextField
                        label={
                            `${guest.total_stays} ${
                                guest.total_stays === 1
                                    ? "estadía"
                                    : "estadías"
                            }`
                        }
                        size="xs"
                        color="gray"
                    />
                </View>

                {guest.phone ? (
                    <View style={styles.footerDetail}>
                        <Phone size={15} color={tokens.colors.gray} />

                        <TextField
                            label={guest.phone}
                            size="xs"
                            color="gray"
                        />
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    guestCard: {
        backgroundColor: tokens.colors.white,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: 16,
        padding: 15,
        gap: 14,
    },
    guestTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: tokens.colors.light,
        alignItems: "center",
        justifyContent: "center",
    },
    guestInfo: {
        flex: 1,
        gap: 5,
    },
    badges: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    activeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: tokens.colors.greenBg,
    },
    activeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: tokens.colors.green,
    },
    frequentBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: tokens.colors.light,
    },
    guestFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: tokens.colors.border,
        paddingTop: 12,
    },
    footerDetail: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
})