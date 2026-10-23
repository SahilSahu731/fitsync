import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

// Android channel sound settings are immutable after creation.
const CHANNEL_ID = "workout-rest-v2";
const REST_SOUND = "rest_complete.wav";

let configured = false;
const STORAGE_KEY = "fitsync.workout.rest-notification.v1";
const NOTIFICATION_ID = "fitsync-workout-rest";
let operations: Promise<void> = Promise.resolve();

function enqueue(operation: () => Promise<void>) {
    const result = operations.then(operation);
    operations = result.catch(() => {});
    return result;
}

export async function configureWorkoutNotifications() {
    if (configured) return;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false
        })
    });

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(
            CHANNEL_ID,
            {
                name: "Workout rest timer",
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 200, 150, 200],
                sound: REST_SOUND
            }
        );
    }

    configured = true;
}

export async function requestWorkoutNotificationPermission() {
    await configureWorkoutNotifications();

    const current = await Notifications.getPermissionsAsync();

    if (current.granted) return true;

    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
}

export function scheduleRestNotification(seconds: number) {
    const endsAt = Date.now() + seconds * 1000;
    return enqueue(async () => {
        await cancelStoredRestNotification();

        if (!Number.isFinite(seconds) || seconds <= 0) return;

        await configureWorkoutNotifications();
        const { granted: allowed } = await Notifications.getPermissionsAsync();

        if (!allowed || endsAt <= Date.now()) return;

        // Save before scheduling to survive termination during the native call.
        await AsyncStorage.setItem(STORAGE_KEY, NOTIFICATION_ID);
        await Notifications.scheduleNotificationAsync({
            identifier: NOTIFICATION_ID,
            content: {
                title: "Rest complete 💪",
                body: "Time for your next set.",
                sound: REST_SOUND,
                data: {
                    type: "workout-rest-complete"
                }
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: Math.max(1, Math.ceil((endsAt - Date.now()) / 1000)),
                channelId: CHANNEL_ID
            }
        });
    });
}

async function cancelStoredRestNotification() {
    const id = await AsyncStorage.getItem(STORAGE_KEY);
    await Notifications.cancelScheduledNotificationAsync(id ?? NOTIFICATION_ID);
    await AsyncStorage.removeItem(STORAGE_KEY);
}

export function cancelRestNotification() {
    return enqueue(cancelStoredRestNotification);
}
