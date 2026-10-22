
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import {
    createLocalNotification,
    getNotificationSettings,
    setNotificationSchedule,
} from "../database/repositories/notifications.repository";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const CHANNEL_ID = "hotel-alerts";

const CATEGORY_SETTING = {
    CHECKOUT: "checkout_alerts",
    RESERVATION: "reservation_alerts",
    ROOM: "room_alerts",
    CASH: "cash_alerts",
    LICENSE: "license_alerts",
};

export async function initializeLocalNotifications() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(
            CHANNEL_ID,
            {
                name: "Alertas del hotel",
                importance:
                    Notifications.AndroidImportance.HIGH,
                sound: "default",
            }
        );
    }

    const current = await Notifications.getPermissionsAsync();

    if (current.granted) return true;

    const requested =
        await Notifications.requestPermissionsAsync();

    return requested.granted;
}

export async function scheduleHotelNotification({
    eventKey,
    category,
    title,
    body,
    date,
    route,
    entityId,
}) {
    const settings = await getNotificationSettings();

    if (
        !settings?.enabled ||
        !settings[CATEGORY_SETTING[category]]
    ) {
        return null;
    }

    const scheduledDate = new Date(date);

    if (
        !Number.isFinite(scheduledDate.getTime()) ||
        scheduledDate.getTime() <= Date.now()
    ) {
        return null;
    }

    const record = await createLocalNotification({
        eventKey,
        category,
        title,
        body,
        route,
        entityId,
        scheduledAt: scheduledDate.toISOString(),
    });

    if (record.expo_notification_id) {
        return record;
    }

    const permission =
        await initializeLocalNotifications();

    if (!permission) {
        // El aviso permanece en el centro local.
        return record;
    }

    const notificationId =
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: {
                    eventKey,
                    route: route || "",
                    entityId: entityId || 0,
                },
            },
            trigger: {
                type:
                    Notifications.SchedulableTriggerInputTypes.DATE,
                date: scheduledDate,
                ...(Platform.OS === "android"
                    ? { channelId: CHANNEL_ID }
                    : {}),
            },
        });

    await setNotificationSchedule(
        record.id,
        notificationId
    );

    return record;
}

export async function cancelHotelNotification(
    expoNotificationId
) {
    if (!expoNotificationId) return;

    await Notifications.cancelScheduledNotificationAsync(
        expoNotificationId
    );
}
