
import { useCallback, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import {
    ChevronLeft,
    ChevronDown,
    ImagePlus,
    Check,
    Info,
    Plus,
    Layers,
    BedDouble,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import BottomSheet from "../../components/ui/BottomSheet";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

import {
    listRoomTypes,
    registerRoom,
} from "../../services/rooms.service";

import {
    registerRoomTypeCategory,
} from "../../services/roomTypes.service";

import {
    listFloors,
    registerFloor,
} from "../../services/floors.service";

import { ROOM_AMENITIES } from "../../constants/amenities";
import { tokens } from "../../styles/tokens";

const C = {
    white: tokens.colors.white,
    black: tokens.colors.black,
    gray: tokens.colors.gray,
    border: tokens.colors.border,
    light: tokens.colors.light,
    primary: tokens.colors.primary,
};

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    multiline = false,
}) {
    return (
        <View style={styles.field}>
            <TextField
                label={label}
                size="sm"
                weight="semibold"
            />

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#a1a1aa"
                keyboardType={keyboardType}
                multiline={multiline}
                style={[
                    styles.input,
                    multiline && styles.multiline,
                ]}
            />
        </View>
    );
}

function SelectField({
    label,
    value,
    placeholder,
    onPress,
}) {
    return (
        <View style={styles.field}>
            <TextField
                label={label}
                size="sm"
                weight="semibold"
            />

            <Pressable
                onPress={onPress}
                style={styles.selector}
            >
                <View style={{ flex: 1 }}>
                    <TextField
                        label={value || placeholder}
                        size="sm"
                        style={{
                            color: value ? C.black : C.gray,
                        }}
                    />
                </View>

                <ChevronDown size={18} color={C.gray} />
            </Pressable>
        </View>
    );
}

function Option({
    title,
    subtitle,
    selected,
    onPress,
    icon: Icon = BedDouble,
}) {
    return (
        <Pressable
            style={styles.option}
            onPress={onPress}
        >
            <View style={styles.optionIcon}>
                <Icon size={19} color={C.black} />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
                <TextField
                    label={title}
                    size="sm"
                    weight="semibold"
                />

                {subtitle ? (
                    <TextField
                        label={subtitle}
                        size="xs"
                        color="gray"
                    />
                ) : null}
            </View>

            {selected && (
                <Check size={19} color={C.primary} />
            )}
        </Pressable>
    );
}

export default function NewRoom() {
    const router = useRouter();

    const [number, setNumber] = useState("");
    const [floor, setFloor] = useState(null);
    const [roomTypeId, setRoomTypeId] = useState(null);

    const [floors, setFloors] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);

    const [description, setDescription] = useState("");
    const [photoUri, setPhotoUri] = useState(null);
    const [amenities, setAmenities] = useState([]);

    const [hourlyPrice, setHourlyPrice] = useState("");
    const [nightlyPrice, setNightlyPrice] = useState("");

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // "floor" | "type" | null
    const [sheet, setSheet] = useState(null);

    // null | "floor" | "type"
    const [creating, setCreating] = useState(null);

    const [newFloor, setNewFloor] = useState("");
    const [newTypeName, setNewTypeName] = useState("");
    const [newTypeDescription, setNewTypeDescription] = useState("");
    const [newTypeCapacity, setNewTypeCapacity] = useState("2");

    const [creatingItem, setCreatingItem] = useState(false);

    const loadOptions = useCallback(async () => {
        const [floorData, typeData] = await Promise.all([
            listFloors(),
            listRoomTypes(),
        ]);

        setFloors(floorData);
        setRoomTypes(typeData);
    }, []);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                try {
                    await loadOptions();
                } catch (error) {
                    if (active) {
                        Alert.alert(
                            "Error",
                            error?.message ||
                            "No se pudieron cargar los datos."
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
        }, [loadOptions])
    );

    const openSheet = kind => {
        setCreating(null);
        setSheet(kind);
    };

    const closeSheet = () => {
        if (creatingItem) return;

        setSheet(null);
        setCreating(null);
    };

    const startCreate = kind => {
        if (kind === "floor") {
            setNewFloor("");
        } else {
            setNewTypeName("");
            setNewTypeDescription("");
            setNewTypeCapacity("2");
        }

        setCreating(kind);
    };

    const handleCreateFloor = async () => {
        if (creatingItem) return;

        setCreatingItem(true);

        try {
            const id = await registerFloor(newFloor);
            const updated = await listFloors();

            setFloors(updated);

            const created = updated.find(item => item.id === id);

            if (!created) {
                throw new Error("No se pudo seleccionar el piso.");
            }

            setFloor(created.number);
            setSheet(null);
            setCreating(null);
        } catch (error) {
            Alert.alert(
                "No se pudo crear el piso",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setCreatingItem(false);
        }
    };

    const handleCreateType = async () => {
        if (creatingItem) return;

        setCreatingItem(true);

        try {
            const id = await registerRoomTypeCategory({
                name: newTypeName,
                description: newTypeDescription,
                capacity: newTypeCapacity,
            });

            const updated = await listRoomTypes();
            setRoomTypes(updated);

            setRoomTypeId(id);
            setSheet(null);
            setCreating(null);
        } catch (error) {
            Alert.alert(
                "No se pudo crear la categoría",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setCreatingItem(false);
        }
    };

    const pickPhoto = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                "Permiso requerido",
                "Autoriza el acceso a tus fotografías."
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.length) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const toggleAmenity = key => {
        setAmenities(current =>
            current.includes(key)
                ? current.filter(item => item !== key)
                : [...current, key]
        );
    };

    const handleSave = async () => {
        if (saving) return;

        if (!number.trim()) {
            Alert.alert("Atención", "Ingresa el número de habitación.");
            return;
        }

        if (floor === null) {
            Alert.alert("Atención", "Selecciona un piso.");
            return;
        }

        if (roomTypeId === null) {
            Alert.alert("Atención", "Selecciona una categoría.");
            return;
        }

        setSaving(true);
        let savedPhotoUri = null;
        let roomCreated = false;

        try {
            if (photoUri) {
                const folder =
                    `${FileSystem.documentDirectory}rooms/`;

                await FileSystem.makeDirectoryAsync(folder, {
                    intermediates: true,
                });

                savedPhotoUri =
                    `${folder}${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}.jpg`;

                await FileSystem.copyAsync({
                    from: photoUri,
                    to: savedPhotoUri,
                });
            }

            await registerRoom({
                number,
                floor,
                roomTypeId,
                description,
                photoUri: savedPhotoUri,
                amenities,
                hourlyPrice,
                nightlyPrice,
            });

            roomCreated = true;

            Alert.alert(
                "Habitación creada",
                "La habitación se registró correctamente.",
                [{
                    text: "Aceptar",
                    onPress: () => router.back(),
                }]
            );
        } catch (error) {
            if (savedPhotoUri && !roomCreated) {
                await FileSystem.deleteAsync(savedPhotoUri, {
                    idempotent: true,
                }).catch(() => {});
            }

            Alert.alert(
                "No se pudo guardar",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setSaving(false);
        }
    };

    const selectedFloor = floors.find(
        item => item.number === floor
    );

    const selectedType = roomTypes.find(
        item => item.id === roomTypeId
    );

    return (
        <ScreenTab>
            <View style={styles.header}>
                <Button
                    icon={ChevronLeft}
                    iconOnly
                    variant="ghost"
                    accessibilityLabel="Volver"
                    onPress={() => router.back()}
                />

                <TextField
                    label="Nueva habitación"
                    size="2xl"
                    weight="bold"
                />
            </View>

            <View style={styles.field}>
                <TextField
                    label="Fotografía de la habitación"
                    size="sm"
                    weight="semibold"
                />

                <Pressable
                    onPress={pickPhoto}
                    style={styles.photoBox}
                >
                    {photoUri ? (
                        <Image
                            source={{ uri: photoUri }}
                            style={styles.photo}
                        />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <ImagePlus size={30} color={C.gray} />
                            <TextField
                                label="Agregar fotografía"
                                size="sm"
                                color="gray"
                            />
                        </View>
                    )}
                </Pressable>
            </View>

            <Field
                label="Número de habitación *"
                placeholder="Ej. 201"
                value={number}
                onChangeText={setNumber}
            />

            <SelectField
                label="Piso *"
                placeholder="Seleccionar piso"
                value={
                    floor === null
                        ? null
                        : floor === 0
                            ? "Planta baja"
                            : `Piso ${floor}`
                }
                onPress={() => openSheet("floor")}
            />

            <SelectField
                label="Tipo de habitación *"
                placeholder="Seleccionar categoría"
                value={selectedType?.name}
                onPress={() => openSheet("type")}
            />

            <Field
                label="Descripción"
                placeholder="Describe esta habitación..."
                value={description}
                onChangeText={setDescription}
                multiline
            />

            <View style={styles.field}>
                <TextField
                    label="Servicios incluidos"
                    size="lg"
                    weight="semibold"
                />

                <TextField
                    label="Selecciona los servicios disponibles."
                    size="xs"
                    color="gray"
                />

                <View style={styles.badges}>
                    {ROOM_AMENITIES.map(item => {
                        const selected =
                            amenities.includes(item.key);

                        return (
                            <Pressable
                                key={item.key}
                                onPress={() => toggleAmenity(item.key)}
                                style={[
                                    styles.badge,
                                    selected && styles.badgeSelected,
                                ]}
                            >
                                {selected && (
                                    <Check
                                        size={14}
                                        color={C.white}
                                    />
                                )}

                                <TextField
                                    label={item.label}
                                    size="xs"
                                    style={{
                                        color: selected
                                            ? C.white
                                            : C.black,
                                    }}
                                />
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.field}>
                <TextField
                    label="Tarifas"
                    size="lg"
                    weight="semibold"
                />

                <TextField
                    label="Configura los precios en soles."
                    size="xs"
                    color="gray"
                />

                <Field
                    label="Precio por hora"
                    placeholder="Ej. 25.00"
                    value={hourlyPrice}
                    onChangeText={setHourlyPrice}
                    keyboardType="decimal-pad"
                />

                <Field
                    label="Precio por noche"
                    placeholder="Ej. 90.00"
                    value={nightlyPrice}
                    onChangeText={setNightlyPrice}
                    keyboardType="decimal-pad"
                />
            </View>

            <View style={styles.notice}>
                <Info size={18} color={C.gray} />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="La habitación se registrará como Disponible."
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <Button
                text="Guardar habitación"
                loading={saving}
                disabled={saving || loading}
                onPress={handleSave}
            />

            {/* BOTTOM SHEET: PISOS */}
            <BottomSheet
                visible={sheet === "floor"}
                title={
                    creating === "floor"
                        ? "Nuevo piso"
                        : "Seleccionar piso"
                }
                busy={creatingItem}
                onClose={closeSheet}
            >
                {creating === "floor" ? (
                    <>
                        <Field
                            label="Número de piso *"
                            placeholder="0 = Planta baja, 1, 2, 3..."
                            keyboardType="number-pad"
                            value={newFloor}
                            onChangeText={setNewFloor}
                        />

                        <Button
                            text="Guardar piso"
                            loading={creatingItem}
                            disabled={creatingItem}
                            onPress={handleCreateFloor}
                        />

                        <Button
                            text="Volver a los pisos"
                            variant="ghost"
                            disabled={creatingItem}
                            onPress={() => setCreating(null)}
                        />
                    </>
                ) : (
                    <>
                        {floors.length === 0 && (
                            <TextField
                                label="Todavía no hay pisos registrados."
                                size="sm"
                                color="gray"
                            />
                        )}

                        {floors.map(item => (
                            <Option
                                key={item.id}
                                icon={Layers}
                                title={
                                    item.number === 0
                                        ? "Planta baja"
                                        : `Piso ${item.number}`
                                }
                                selected={floor === item.number}
                                onPress={() => {
                                    setFloor(item.number);
                                    closeSheet();
                                }}
                            />
                        ))}

                        <Button
                            text="Crear nuevo piso"
                            icon={Plus}
                            variant="secondary"
                            onPress={() => startCreate("floor")}
                        />
                    </>
                )}
            </BottomSheet>

            {/* BOTTOM SHEET: CATEGORÍAS */}
            <BottomSheet
                visible={sheet === "type"}
                title={
                    creating === "type"
                        ? "Nueva categoría"
                        : "Tipo de habitación"
                }
                busy={creatingItem}
                onClose={closeSheet}
            >
                {creating === "type" ? (
                    <>
                        <Field
                            label="Nombre *"
                            placeholder="Ej. Matrimonial"
                            value={newTypeName}
                            onChangeText={setNewTypeName}
                        />

                        <Field
                            label="Descripción"
                            placeholder="Descripción de la categoría"
                            value={newTypeDescription}
                            onChangeText={setNewTypeDescription}
                            multiline
                        />

                        <Field
                            label="Capacidad *"
                            placeholder="Ej. 2"
                            value={newTypeCapacity}
                            onChangeText={setNewTypeCapacity}
                            keyboardType="number-pad"
                        />

                        <Button
                            text="Guardar categoría"
                            loading={creatingItem}
                            disabled={creatingItem}
                            onPress={handleCreateType}
                        />

                        <Button
                            text="Volver a las categorías"
                            variant="ghost"
                            disabled={creatingItem}
                            onPress={() => setCreating(null)}
                        />
                    </>
                ) : (
                    <>
                        {roomTypes.length === 0 && (
                            <TextField
                                label="Todavía no hay categorías registradas."
                                size="sm"
                                color="gray"
                            />
                        )}

                        {roomTypes.map(item => (
                            <Option
                                key={item.id}
                                title={item.name}
                                subtitle={`${item.capacity} ${
                                    item.capacity === 1
                                        ? "persona"
                                        : "personas"
                                }`}
                                selected={roomTypeId === item.id}
                                onPress={() => {
                                    setRoomTypeId(item.id);
                                    closeSheet();
                                }}
                            />
                        ))}

                        <Button
                            text="Crear nueva categoría"
                            icon={Plus}
                            variant="secondary"
                            onPress={() => startCreate("type")}
                        />
                    </>
                )}
            </BottomSheet>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    field: {
        gap: 10,
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: C.white,
        color: C.black,
        fontFamily: "Poppins-Regular",
        fontSize: 14,
    },
    multiline: {
        minHeight: 110,
        textAlignVertical: "top",
    },
    photoBox: {
        height: 190,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        overflow: "hidden",
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
        gap: 12,
    },
    selector: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        backgroundColor: C.white,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 58,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: C.white,
    },
    optionIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    badges: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
        backgroundColor: C.white,
    },
    badgeSelected: {
        backgroundColor: C.primary,
        borderColor: C.primary,
    },
    notice: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 14,
        borderRadius: 12,
        backgroundColor: C.light,
    },
});