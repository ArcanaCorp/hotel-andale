import { StyleSheet } from "react-native";
import { tokens } from "../../styles/tokens";

export default function EmptyCard ({ bookings }) {
    return (
        <View style={styles.empty}>
            <CalendarDays size={32} color={tokens.colors.gray} />
            <TextField
                label={bookings.length === 0 ? "Aún no tienes reservas" : "Sin resultados"}
                size="md"
                weight="semibold"
            />

            <TextField
                label={bookings.length === 0 ? "Las reservas que registres aparecerán aquí." : "Prueba con otra búsqueda o estado."}
                size="xs"
                color="gray"
                align="center"
            />
        </View>
    )
}

const styles = StyleSheet.create({
    empty: {
        padding: 30,
        backgroundColor: tokens.colors.white,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: 16,
        alignItems: "center",
        gap: 12,
    },
})