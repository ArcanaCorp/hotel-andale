import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getDatabase } from "../database";
import { getHotelProfile } from "../services/profile.service";
import { useLicense } from "./LicenseContext";

const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
    const { active, loading: licenseLoading } = useLicense();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!active) {
                setProfile(null);
                return;
            }

            await getDatabase();

            const hotel = await getHotelProfile();
            setProfile(hotel);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [active]);

    useEffect(() => {
        if (!licenseLoading) {
            refresh();
        }
    }, [licenseLoading, refresh]);

    const contextValue = {
        profile,
        loading: licenseLoading || loading,
        error,
        refresh,
        setProfile
    }

    return (
        <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);

    if (!context) {
        throw new Error(
            "useProfile requiere ProfileProvider"
        );
    }

    return context;
};