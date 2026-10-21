import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import lightFont from "../../assets/fonts/Poppins-Light.ttf";
import boldFont from "../../assets/fonts/Poppins-Bold.ttf";
import semiboldFont from "../../assets/fonts/Poppins-SemiBold.ttf";
import mediumFont from "../../assets/fonts/Poppins-Medium.ttf";
import regularFont from "../../assets/fonts/Poppins-Regular.ttf";

import { useEffect } from "react";
import { Stack } from "expo-router";

import Providers from "../providers";
import { useProfile } from "../context/ProfileContext";
import { useLicense } from "../context/LicenseContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Routes({ fontsReady }) {

    const { profile, loading, error } = useProfile();
    const { active } = useLicense();

    useEffect(() => {
        if (fontsReady && !loading && !error) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [fontsReady, loading, error]);

    if (loading || error) return null;

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />

            <Stack.Protected guard={!active}>
                <Stack.Screen name="activation" />
            </Stack.Protected>

            <Stack.Protected guard={active && !profile?.isConfigured}>
                <Stack.Screen name="onboarding" />
            </Stack.Protected>

            <Stack.Protected guard={active && !!profile?.isConfigured}>
                <Stack.Screen name="(tabs)" />
            </Stack.Protected>
        </Stack>
    );
}

export default function RootLayout() {

    const [fontLoad, fontError] = useFonts({
        "Poppins-Regular": regularFont,
        "Poppins-Medium": mediumFont,
        "Poppins-SemiBold": semiboldFont,
        "Poppins-Bold": boldFont,
        "Poppins-Light": lightFont,
    });

    if (!fontLoad && !fontError) return null;

    return (
        <Providers>
            <Routes fontsReady={fontLoad || !!fontError} />
        </Providers>
    );
}