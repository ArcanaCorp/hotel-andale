import { LicenseProvider } from "../context/LicenseContext";
import { ProfileProvider } from "../context/ProfileContext";

export default function Providers ({ children }) {
    return (
        <>
            <LicenseProvider>
                <ProfileProvider>
                    {children}
                </ProfileProvider>
            </LicenseProvider>
        </>
    )
}