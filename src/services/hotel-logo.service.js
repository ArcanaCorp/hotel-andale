
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

const LOGO_DIRECTORY =
    `${FileSystem.documentDirectory}hotel/`;

export async function selectHotelLogo() {
    const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
        throw new Error(
            "Necesitamos permiso para seleccionar una imagen."
        );
    }

    const result =
        await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

    if (result.canceled || !result.assets?.length) {
        return null;
    }

    const asset = result.assets[0];

    await FileSystem.makeDirectoryAsync(
        LOGO_DIRECTORY,
        { intermediates: true }
    );

    const extension =
        asset.mimeType === "image/png"
            ? "png"
            : "jpg";

    const destination =
        `${LOGO_DIRECTORY}logo-${Date.now()}.${extension}`;

    await FileSystem.copyAsync({
        from: asset.uri,
        to: destination,
    });

    return destination;
}

export async function deleteHotelLogo(uri) {
    if (!uri || !uri.startsWith(LOGO_DIRECTORY)) {
        return;
    }

    await FileSystem.deleteAsync(uri, {
        idempotent: true,
    });
}
