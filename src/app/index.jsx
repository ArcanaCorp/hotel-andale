import { Redirect } from "expo-router";
import { useProfile } from "../context/ProfileContext";
import { useLicense } from "../context/LicenseContext";

export default function Index() {
    const { profile, loading } = useProfile();
    const { active } = useLicense();

    if (loading) return null;

    if (!active) {
        return <Redirect href="/activation" />;
    }

    if (!profile?.isConfigured) {
        return <Redirect href="/onboarding" />;
    }

    return <Redirect href="/(tabs)" />;
}
