import { Tabs } from "expo-router";
import { House, BedDouble, CalendarDays, UsersRound, Settings2 } from "lucide-react-native";

const ACTIVE = "#18181b";
const INACTIVE = "#a1a1aa";

export default function TabsLayout() {

    const optionScreen = {
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopColor: "#e4e4e7",
            borderTopWidth: 1,
            elevation: 0,
        },
        tabBarLabelStyle: {
            fontFamily: "Poppins-Medium",
            fontSize: 10,
        },
        tabBarIconStyle: {
            marginTop: 4,
        },
    }

    return (
        <Tabs screenOptions={optionScreen}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Inicio",
                    tabBarIcon: ({ color, size }) => (
                        <House size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="rooms"
                options={{
                    title: "Habitaciones",
                    tabBarIcon: ({ color, size }) => (
                        <BedDouble size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="bookings"
                options={{
                    title: "Reservas",
                    tabBarIcon: ({ color, size }) => (
                        <CalendarDays size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="guests"
                options={{
                    title: "Huéspedes",
                    tabBarIcon: ({ color, size }) => (
                        <UsersRound size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="management"
                options={{
                    title: "Gestión",
                    tabBarIcon: ({ color, size }) => (
                        <Settings2 size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
