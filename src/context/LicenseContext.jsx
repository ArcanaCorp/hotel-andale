import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getLicenseState, activateLicense } from "../license/service";

const LicenseContext = createContext(null);

export const LicenseProvider = ({ children }) => {
    const [state, setState] = useState({
        id: "",
        active: false,
        reason: ""
    });

    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);

        try {
            const result = await getLicenseState();
            setState(result);
            return result;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh().catch(console.error);
    }, [refresh]);

    const activate = useCallback(async (code) => {
        const result = await activateLicense(code);
        setState(result);
        return result;
    }, []);

    const contextValue = {
                ...state,
                loading,
                refresh,
                activate
            }

    return (
        <LicenseContext.Provider value={contextValue}>{children}</LicenseContext.Provider>
    );
}

export function useLicense() {
    const context = useContext(LicenseContext);

    if (!context) {
        throw new Error(
            "useLicense requiere LicenseProvider"
        );
    }

    return context;
}