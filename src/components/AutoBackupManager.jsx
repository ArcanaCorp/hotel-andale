
import { useEffect } from "react";
import { AppState } from "react-native";

import {
    runAutomaticBackupIfDue,
} from "../services/backup.service";

let running = false;

async function checkBackup() {
    if (running) return;

    running = true;

    try {
        await runAutomaticBackupIfDue();
    } catch (error) {
        console.warn(
            "Error en copia automática:",
            error
        );
    } finally {
        running = false;
    }
}

export default function AutoBackupManager() {
    useEffect(() => {
        // Ejecutar al abrir la aplicación.
        checkBackup();

        const subscription =
            AppState.addEventListener(
                "change",
                state => {
                    if (state === "active") {
                        checkBackup();
                    }
                }
            );

        return () => subscription.remove();
    }, []);

    return null;
}