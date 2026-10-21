import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getHotelProfile, saveHotelProfile } from "../services/profile.service";

import { useLicense } from "./LicenseContext";

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
    const { active, loading: licenseLoading } = useLicense();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Evita aplicar respuestas de cargas anteriores.
    const requestId = useRef(0);

    const refresh = useCallback(async () => {
        const currentRequest = ++requestId.current;

        setLoading(true);
        setError(null);

        try {
            if (!active) {
                setProfile(null);
                return null;
            }

            const hotel = await getHotelProfile();

            if (currentRequest === requestId.current) {
                setProfile(hotel);
            }

            return hotel;
        } catch (err) {
            if (currentRequest === requestId.current) {
                setError(
                    err?.message ||
                    "No se pudo cargar el perfil del hotel."
                );
            }

            throw err;
        } finally {
            if (currentRequest === requestId.current) {
                setLoading(false);
            }
        }
    }, [active]);

    useEffect(() => {
        if (licenseLoading) return;

        refresh().catch((err) => {
            console.error("Error cargando perfil:", err);
        });

        return () => {
            requestId.current += 1;
        };
    }, [licenseLoading, refresh]);

    const saveProfile = useCallback(async (data) => {
        if (!active) {
            throw new Error(
                "Necesitas una licencia activa para configurar el hotel."
            );
        }

        if (saving) {
            throw new Error(
                "Ya se está guardando el perfil."
            );
        }

        setSaving(true);
        setError(null);

        try {
            const updatedProfile = await saveHotelProfile(data);

            // Actualiza inmediatamente el estado global.
            setProfile(updatedProfile);

            return updatedProfile;
        } catch (err) {
            const message =
                err?.message ||
                "No se pudo guardar el perfil del hotel.";

            setError(message);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [active, saving]);

    const isConfigured = profile?.isConfigured === true;

    const contextValue = useMemo(() => ({
        profile,
        loading: licenseLoading || loading,
        saving,
        error,
        isConfigured,
        refresh,
        saveProfile,
    }), [
        profile,
        licenseLoading,
        loading,
        saving,
        error,
        isConfigured,
        refresh,
        saveProfile,
    ]);

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);

    if (!context) {
        throw new Error(
            "useProfile requiere ProfileProvider."
        );
    }

    return context;
}