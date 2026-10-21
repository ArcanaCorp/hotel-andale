
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from "react-native";

import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
    ArrowLeft,
    BedDouble,
    Camera,
    Check,
    ChevronDown,
    ImagePlus,
    Save,
    Trash2,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";
import { STATUS } from "../../constants/rooms";

import { getDatabase } from "../../database";

import {
    getRoomById,
    updateRoom,
    canDeleteRoom,
    deleteRoom,
} from "../../database/repositories/rooms.repository";

const C = tokens.colors;

const ROOM_STATUSES = [
    { value: "AVAILABLE", label: "Disponible" },
    { value: "OCCUPIED", label: "Ocupada" },
    { value: "CLEANING", label: "En limpieza" },
    { value: "MAINTENANCE", label: "En mantenimiento" },
];

function FieldLabel({ children }) {
    return (
        <TextField
            label={children}
            size="sm"
            weight="medium"
        />
    );
}

export default function RoomDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const roomId = Number(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [roomTypes, setRoomTypes] = useState([]);

    const [number, setNumber] = useState("");
    const [roomTypeId, setRoomTypeId] = useState(null);
    const [floor, setFloor] = useState("");
    const [description, setDescription] = useState("");
    const [photoUri, setPhotoUri] = useState(null);
    const [originalPhotoUri, setOriginalPhotoUri] =
        useState(null);

    const [operationalStatus, setOperationalStatus] =
        useState("AVAILABLE");

    const [isActive, setIsActive] = useState(true);

    const [typeSheet, setTypeSheet] = useState(false);
    const [statusSheet, setStatusSheet] = useState(false);
    const [photoSheet, setPhotoSheet] = useState(false);

    const stagedPhotos = useRef([]);

    // CARGAR HABITACIÓN
    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                setLoading(true);

                try {
                    if (!Number.isSafeInteger(roomId) ||
                        roomId <= 0) {
                        throw new Error(
                            "Identificador de habitación inválido."
                        );
                    }

                    const db = await getDatabase();

                    const [room, types] = await Promise.all([
                        getRoomById(roomId),
                        db.getAllAsync(`
                            SELECT id, name
                            FROM room_types
                            ORDER BY name ASC
                        `),
                    ]);

                    if (!room) {
                        throw new Error(
                            "No se encontró la habitación."
                        );
                    }

                    if (!active) return;

                    setRoomTypes(types);
                    setNumber(room.number || "");
                    setRoomTypeId(room.room_type_id);
                    setFloor(room.floor || "");
                    setDescription(room.description || "");

                    setPhotoUri(room.photo_uri || null);
                    setOriginalPhotoUri(
                        room.photo_uri || null
                    );

                    setOperationalStatus(
                        room.operational_status || "AVAILABLE"
                    );

                    setIsActive(room.is_active === 1);
                } catch (error) {
                    if (active) {
                        Alert.alert(
                            "Error",
                            error?.message ||
                                "No se pudo cargar la habitación."
                        );
                    }
                } finally {
                    if (active) setLoading(false);
                }
            }

            load();

            return () => {
                active = false;
            };
        }, [roomId])
    );

    const selectedType = roomTypes.find(
        type => type.id === roomTypeId
    );

    const selectedStatus = ROOM_STATUSES.find(
        status => status.value === operationalStatus
    );

    const statusStyle = STATUS[operationalStatus] || {
        label: "Sin estado",
        color: C.gray,
        background: C.light,
    };

    // GUARDAR FOTO LOCAL
    const persistPhoto = async temporaryUri => {
        const directory =
            `${FileSystem.documentDirectory}rooms/`;

        await FileSystem.makeDirectoryAsync(directory, {
            intermediates: true,
        });

        const extension =
            temporaryUri.split(".").pop()?.toLowerCase();

        const safeExtension =
            ["jpg", "jpeg", "png", "webp"].includes(extension)
                ? extension
                : "jpg";

        const filename =
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}.${safeExtension}`;

        const destination = directory + filename;

        await FileSystem.copyAsync({
            from: temporaryUri,
            to: destination,
        });

        return destination;
    };

    // SELECCIONAR FOTO
    const selectPhoto = async source => {
        setPhotoSheet(false);

        try {
            let result;

            if (source === "camera") {
                const permission =
                    await ImagePicker.requestCameraPermissionsAsync();

                if (!permission.granted) {
                    Alert.alert(
                        "Permiso requerido",
                        "Debes permitir el acceso a la cámara."
                    );
                    return;
                }

                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            } else {
                result =
                    await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ["images"],
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.8,
                    });
            }

            if (result.canceled ||
                !result.assets?.length) {
                return;
            }

            const savedUri = await persistPhoto(
                result.assets[0].uri
            );

            stagedPhotos.current.push(savedUri);
            setPhotoUri(savedUri);
        } catch (error) {
            Alert.alert(
                "Error de fotografía",
                error?.message ||
                    "No se pudo seleccionar la imagen."
            );
        }
    };

    // LIMPIAR FOTOS TEMPORALES NO UTILIZADAS
    const cleanStagedPhotos = async (keepUri = null) => {
        const pending = stagedPhotos.current.filter(
            uri => uri !== keepUri
        );

        for (const uri of pending) {
            try {
                await FileSystem.deleteAsync(uri, {
                    idempotent: true,
                });
            } catch {
                // No bloquear guardado por limpieza.
            }
        }

        stagedPhotos.current =
            keepUri && stagedPhotos.current.includes(keepUri)
                ? [keepUri]
                : [];
    };

    // GUARDAR CAMBIOS
    const handleSave = async () => {
        if (saving || deleting) return;

        const cleanNumber = number.trim();

        if (!cleanNumber) {
            Alert.alert(
                "Campo requerido",
                "Ingresa el número de habitación."
            );
            return;
        }

        if (!roomTypeId) {
            Alert.alert(
                "Campo requerido",
                "Selecciona el tipo de habitación."
            );
            return;
        }

        setSaving(true);

        try {
            await updateRoom(roomId, {
                number: cleanNumber,
                roomTypeId,
                floor: floor.trim(),
                description: description.trim(),
                photoUri,
                operationalStatus,
                isActive,
            });

            await cleanStagedPhotos(photoUri);

            Alert.alert(
                "Cambios guardados",
                "La habitación se actualizó correctamente.",
                [
                    {
                        text: "Aceptar",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                "No se pudo actualizar",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setSaving(false);
        }
    };

    // ELIMINAR HABITACIÓN
    const handleDelete = async () => {
        if (saving || deleting) return;

        try {
            const validation = await canDeleteRoom(
                roomId
            );

            if (!validation.allowed) {
                Alert.alert(
                    "No se puede eliminar",
                    validation.reason
                );
                return;
            }

            Alert.alert(
                "Eliminar habitación",
                `¿Estás seguro de eliminar definitivamente la habitación ${number}?\n\nSe eliminarán su fotografía, tarifas y comodidades asociadas. Esta acción no se puede deshacer.`,
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                    },
                    {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: async () => {
                            setDeleting(true);

                            try {
                                await deleteRoom(roomId);

                                // La base de datos ya fue eliminada.
                                // Limpiar archivos físicos.
                                const photos = [
                                    originalPhotoUri,
                                    ...stagedPhotos.current,
                                ].filter(Boolean);

                                for (const uri of new Set(photos)) {
                                    if (!uri.startsWith(
                                        FileSystem.documentDirectory
                                    )) {
                                        continue;
                                    }

                                    try {
                                        await FileSystem.deleteAsync(
                                            uri,
                                            { idempotent: true }
                                        );
                                    } catch {
                                        // La eliminación en DB
                                        // ya fue confirmada.
                                    }
                                }

                                stagedPhotos.current = [];

                                Alert.alert(
                                    "Habitación eliminada",
                                    "La habitación y sus datos asociados fueron eliminados.",
                                    [
                                        {
                                            text: "Aceptar",
                                            onPress: () =>
                                                router.back(),
                                        },
                                    ]
                                );
                            } catch (error) {
                                Alert.alert(
                                    "No se pudo eliminar",
                                    error?.message ||
                                        "Ocurrió un error."
                                );
                            } finally {
                                setDeleting(false);
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudo verificar la habitación."
            );
        }
    };

    if (loading) {
        return (
            <ScreenTab>
                <View style={styles.loading}>
                    <ActivityIndicator
                        size="large"
                        color={C.black}
                    />

                    <TextField
                        label="Cargando habitación..."
                        size="sm"
                        color="gray"
                    />
                </View>
            </ScreenTab>
        );
    }

    return (
        <ScreenTab>
            {/* ENCABEZADO */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <ArrowLeft
                        size={22}
                        color={C.black}
                    />
                </Pressable>

                <View style={{ flex: 1 }}>
                    <TextField
                        label={`Habitación ${number}`}
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Detalles y configuración"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {/* FOTOGRAFÍA */}
            <View style={styles.section}>
                <Pressable
                    onPress={() => setPhotoSheet(true)}
                    style={styles.photoContainer}
                >
                    {photoUri ? (
                        <Image
                            source={{ uri: photoUri }}
                            style={styles.photo}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <ImagePlus
                                size={34}
                                color={C.gray}
                            />

                            <TextField
                                label="Añadir fotografía"
                                size="sm"
                                weight="medium"
                            />

                            <TextField
                                label="Toca para seleccionar una imagen"
                                size="xs"
                                color="gray"
                            />
                        </View>
                    )}

                    {photoUri && (
                        <View style={styles.photoOverlay}>
                            <Camera
                                size={18}
                                color="#ffffff"
                            />

                            <TextField
                                label="Cambiar fotografía"
                                size="sm"
                                weight="semibold"
                                style={{ color: "#ffffff" }}
                            />
                        </View>
                    )}
                </Pressable>

                {!!photoUri && (
                    <Pressable
                        style={styles.removePhoto}
                        onPress={() => setPhotoUri(null)}
                    >
                        <Trash2
                            size={16}
                            color="#dc2626"
                        />

                        <TextField
                            label="Quitar fotografía"
                            size="sm"
                            style={{ color: "#dc2626" }}
                        />
                    </Pressable>
                )}
            </View>

            {/* RESUMEN */}
            <View style={styles.summary}>
                <View style={styles.roomIcon}>
                    <BedDouble
                        size={26}
                        color={C.black}
                    />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                    <TextField
                        label={
                            selectedType?.name ||
                            "Habitación"
                        }
                        size="md"
                        weight="semibold"
                    />

                    <TextField
                        label={
                            floor
                                ? `Piso ${floor}`
                                : "Sin piso"
                        }
                        size="sm"
                        color="gray"
                    />

                    <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor:
                                    statusStyle.background,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                {
                                    backgroundColor:
                                        statusStyle.color,
                                },
                            ]}
                        />

                        <TextField
                            label={statusStyle.label}
                            size="xs"
                            weight="medium"
                            style={{
                                color: statusStyle.color,
                            }}
                        />
                    </View>
                </View>
            </View>

            {/* DATOS GENERALES */}
            <View style={styles.section}>
                <TextField
                    label="Información general"
                    size="lg"
                    weight="bold"
                />

                <View style={styles.field}>
                    <FieldLabel>
                        Número de habitación
                    </FieldLabel>

                    <TextInput
                        value={number}
                        onChangeText={setNumber}
                        placeholder="Ej. 101"
                        placeholderTextColor={C.gray}
                        style={styles.input}
                    />
                </View>

                <View style={styles.field}>
                    <FieldLabel>
                        Tipo de habitación
                    </FieldLabel>

                    <Pressable
                        onPress={() => setTypeSheet(true)}
                        style={styles.select}
                    >
                        <TextField
                            label={
                                selectedType?.name ||
                                "Seleccionar tipo"
                            }
                            size="sm"
                        />

                        <ChevronDown
                            size={18}
                            color={C.gray}
                        />
                    </Pressable>
                </View>

                <View style={styles.field}>
                    <FieldLabel>Piso</FieldLabel>

                    <TextInput
                        value={floor}
                        onChangeText={setFloor}
                        placeholder="Ej. 1"
                        placeholderTextColor={C.gray}
                        keyboardType="numeric"
                        style={styles.input}
                    />
                </View>

                <View style={styles.field}>
                    <FieldLabel>
                        Descripción
                    </FieldLabel>

                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe la habitación"
                        placeholderTextColor={C.gray}
                        multiline
                        textAlignVertical="top"
                        style={[
                            styles.input,
                            styles.textarea,
                        ]}
                    />
                </View>
            </View>

            {/* ESTADO */}
            <View style={styles.section}>
                <TextField
                    label="Estado y disponibilidad"
                    size="lg"
                    weight="bold"
                />

                <View style={styles.field}>
                    <FieldLabel>
                        Estado operativo
                    </FieldLabel>

                    <Pressable
                        onPress={() => setStatusSheet(true)}
                        style={styles.select}
                    >
                        <TextField
                            label={
                                selectedStatus?.label ||
                                "Seleccionar estado"
                            }
                            size="sm"
                        />

                        <ChevronDown
                            size={18}
                            color={C.gray}
                        />
                    </Pressable>
                </View>

                <View style={styles.switchRow}>
                    <View style={{ flex: 1, gap: 5 }}>
                        <TextField
                            label="Habitación activa"
                            size="sm"
                            weight="semibold"
                        />

                        <TextField
                            label="Permite utilizar esta habitación para nuevas operaciones."
                            size="xs"
                            color="gray"
                        />
                    </View>

                    <Switch
                        value={isActive}
                        onValueChange={setIsActive}
                        trackColor={{
                            false: C.border,
                            true: C.black,
                        }}
                        thumbColor={C.white}
                    />
                </View>
            </View>

            {/* ACCIONES */}
            <View style={styles.actions}>
                <Button
                    text="Guardar cambios"
                    icon={Save}
                    loading={saving}
                    disabled={saving || deleting}
                    onPress={handleSave}
                    fullWidth
                />

                <Button
                    text="Eliminar habitación"
                    icon={Trash2}
                    variant="dangerSoft"
                    loading={deleting}
                    disabled={saving || deleting}
                    onPress={handleDelete}
                    fullWidth
                />
            </View>

            {/* TIPO DE HABITACIÓN */}
            <BottomSheet
                visible={typeSheet}
                title="Tipo de habitación"
                onClose={() => setTypeSheet(false)}
            >
                <View style={styles.sheetContent}>
                    {roomTypes.map(type => (
                        <Pressable
                            key={type.id}
                            style={styles.sheetOption}
                            onPress={() => {
                                setRoomTypeId(type.id);
                                setTypeSheet(false);
                            }}
                        >
                            <TextField
                                label={type.name}
                                size="sm"
                            />

                            {roomTypeId === type.id && (
                                <Check
                                    size={19}
                                    color={C.black}
                                />
                            )}
                        </Pressable>
                    ))}
                </View>
            </BottomSheet>

            {/* ESTADO OPERATIVO */}
            <BottomSheet
                visible={statusSheet}
                title="Estado operativo"
                onClose={() => setStatusSheet(false)}
            >
                <View style={styles.sheetContent}>
                    {ROOM_STATUSES.map(status => (
                        <Pressable
                            key={status.value}
                            style={styles.sheetOption}
                            onPress={() => {
                                setOperationalStatus(
                                    status.value
                                );
                                setStatusSheet(false);
                            }}
                        >
                            <TextField
                                label={status.label}
                                size="sm"
                            />

                            {operationalStatus ===
                                status.value && (
                                <Check
                                    size={19}
                                    color={C.black}
                                />
                            )}
                        </Pressable>
                    ))}
                </View>
            </BottomSheet>

            {/* CAMBIAR FOTO */}
            <BottomSheet
                visible={photoSheet}
                title="Fotografía de habitación"
                onClose={() => setPhotoSheet(false)}
            >
                <View style={styles.sheetContent}>
                    <Pressable
                        style={styles.sheetOption}
                        onPress={() =>
                            selectPhoto("camera")
                        }
                    >
                        <Camera
                            size={20}
                            color={C.black}
                        />

                        <View style={{ flex: 1 }}>
                            <TextField
                                label="Tomar fotografía"
                                size="sm"
                            />
                        </View>
                    </Pressable>

                    <Pressable
                        style={styles.sheetOption}
                        onPress={() =>
                            selectPhoto("gallery")
                        }
                    >
                        <ImagePlus
                            size={20}
                            color={C.black}
                        />

                        <View style={{ flex: 1 }}>
                            <TextField
                                label="Elegir de galería"
                                size="sm"
                            />
                        </View>
                    </Pressable>
                </View>
            </BottomSheet>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: 60,
        alignItems: "center",
        gap: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
        justifyContent: "center",
    },
    section: {
        gap: 15,
    },
    photoContainer: {
        height: 220,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.light,
    },
    photo: {
        width: "100%",
        height: "100%",
    },
    photoPlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    photoOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.60)",
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    removePhoto: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 8,
    },
    summary: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 18,
    },
    roomIcon: {
        width: 65,
        height: 65,
        borderRadius: 15,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    statusBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    field: {
        gap: 8,
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 15,
        backgroundColor: C.white,
        fontSize: 14,
        color: C.black,
    },
    textarea: {
        minHeight: 105,
        paddingTop: 14,
    },
    select: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 15,
        backgroundColor: C.white,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 10,
    },
    actions: {
        gap: 12,
        paddingBottom: 20,
    },
    sheetContent: {
        gap: 4,
        paddingBottom: 20,
    },
    sheetOption: {
        minHeight: 54,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
});