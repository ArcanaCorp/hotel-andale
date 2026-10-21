
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import {
    ChevronLeft,
    Plus,
    Pencil,
    Trash2,
    BedDouble,
    Users,
    X,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

import {
    listRoomTypes,
    registerRoomTypeCategory,
    editRoomTypeCategory,
    deleteRoomTypeCategory,
} from "../../services/roomTypes.service";

import { tokens } from "../../styles/tokens";

const C = {
    white: tokens.colors.white,
    black: tokens.colors.black,
    gray: tokens.colors.gray,
    border: tokens.colors.border,
    light: tokens.colors.light,
};

function CategorySheet({
    visible,
    editing,
    form,
    setForm,
    saving,
    onClose,
    onSave,
}) {
    const update = (key, value) => {
        setForm(current => ({
            ...current,
            [key]: value,
        }));
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={styles.modalRoot}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={onClose}
                />

                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.sheetHeader}>
                        <TextField
                            label={
                                editing
                                    ? "Editar categoría"
                                    : "Nueva categoría"
                            }
                            size="xl"
                            weight="bold"
                        />

                        <Button
                            icon={X}
                            iconOnly
                            variant="ghost"
                            accessibilityLabel="Cerrar"
                            onPress={onClose}
                        />
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.sheetBody}
                    >
                        <View style={styles.field}>
                            <TextField
                                label="Nombre *"
                                size="sm"
                                weight="semibold"
                            />

                            <TextInput
                                value={form.name}
                                onChangeText={value =>
                                    update("name", value)
                                }
                                placeholder="Ej. Matrimonial"
                                placeholderTextColor="#a1a1aa"
                                style={styles.input}
                                maxLength={80}
                            />
                        </View>

                        <View style={styles.field}>
                            <TextField
                                label="Descripción"
                                size="sm"
                                weight="semibold"
                            />

                            <TextInput
                                value={form.description}
                                onChangeText={value =>
                                    update("description", value)
                                }
                                placeholder="Describe esta categoría..."
                                placeholderTextColor="#a1a1aa"
                                multiline
                                textAlignVertical="top"
                                style={[
                                    styles.input,
                                    styles.multiline,
                                ]}
                            />
                        </View>

                        <View style={styles.field}>
                            <TextField
                                label="Capacidad de personas *"
                                size="sm"
                                weight="semibold"
                            />

                            <TextInput
                                value={form.capacity}
                                onChangeText={value =>
                                    update("capacity", value)
                                }
                                placeholder="Ej. 2"
                                placeholderTextColor="#a1a1aa"
                                keyboardType="number-pad"
                                style={styles.input}
                                maxLength={3}
                            />
                        </View>

                        <Button
                            text={
                                editing
                                    ? "Guardar cambios"
                                    : "Crear categoría"
                            }
                            loading={saving}
                            disabled={saving}
                            onPress={onSave}
                        />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function CategoryCard({
    item,
    onEdit,
    onDelete,
}) {
    return (
        <View style={styles.card}>
            <View style={styles.categoryIcon}>
                <BedDouble size={22} color={C.black} />
            </View>

            <View style={styles.cardContent}>
                <TextField
                    label={item.name}
                    size="md"
                    weight="semibold"
                />

                {item.description ? (
                    <TextField
                        label={item.description}
                        size="xs"
                        color="gray"
                    />
                ) : null}

                <View style={styles.capacity}>
                    <Users size={14} color={C.gray} />

                    <TextField
                        label={`${item.capacity} ${
                            item.capacity === 1
                                ? "persona"
                                : "personas"
                        }`}
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <View style={styles.actions}>
                <Pressable
                    onPress={() => onEdit(item)}
                    accessibilityLabel={`Editar ${item.name}`}
                    style={styles.actionButton}
                >
                    <Pencil size={18} color={C.gray} />
                </Pressable>

                <Pressable
                    onPress={() => onDelete(item)}
                    accessibilityLabel={`Eliminar ${item.name}`}
                    style={styles.actionButton}
                >
                    <Trash2 size={18} color="#dc2626" />
                </Pressable>
            </View>
        </View>
    );
}

const INITIAL_FORM = {
    name: "",
    description: "",
    capacity: "2",
};

export default function RoomTypes() {
    const router = useRouter();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [sheetVisible, setSheetVisible] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);

    const loadCategories = useCallback(async () => {
        try {
            setError(null);

            const data = await listRoomTypes();
            setCategories(data);
        } catch (err) {
            setError(
                err?.message ||
                "No se pudieron cargar las categorías."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadCategories();
        }, [loadCategories])
    );

    const openCreate = () => {
        setEditing(null);
        setForm({ ...INITIAL_FORM });
        setSheetVisible(true);
    };

    const openEdit = item => {
        setEditing(item);

        setForm({
            name: item.name,
            description: item.description || "",
            capacity: String(item.capacity),
        });

        setSheetVisible(true);
    };

    const closeSheet = () => {
        if (saving) return;
        setSheetVisible(false);
    };

    const handleSave = async () => {
        if (saving) return;

        try {
            setSaving(true);

            if (editing) {
                await editRoomTypeCategory(
                    editing.id,
                    form
                );
            } else {
                await registerRoomTypeCategory(form);
            }

            setSheetVisible(false);
            await loadCategories();
        } catch (err) {
            Alert.alert(
                "No se pudo guardar",
                err?.message || "Ocurrió un error."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = item => {
        Alert.alert(
            "Eliminar categoría",
            `¿Deseas eliminar "${item.name}"? Ya no aparecerá al registrar nuevas habitaciones.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteRoomTypeCategory(
                                item.id
                            );

                            await loadCategories();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                err?.message ||
                                "No se pudo eliminar."
                            );
                        }
                    },
                },
            ]
        );
    };

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

                <View style={{ flex: 1 }}>
                    <TextField
                        label="Tipos de habitación"
                        size="2xl"
                        weight="bold"
                    />
                </View>

                <Button
                    icon={Plus}
                    iconOnly
                    accessibilityLabel="Crear categoría"
                    onPress={openCreate}
                />
            </View>

            <TextField
                label={`${categories.length} categorías registradas`}
                size="xs"
                color="gray"
            />

            {loading ? (
                <ActivityIndicator color={C.black} />
            ) : error ? (
                <View style={styles.empty}>
                    <TextField
                        label={error}
                        size="sm"
                        color="gray"
                        align="center"
                    />

                    <Button
                        text="Reintentar"
                        variant="secondary"
                        onPress={() => {
                            setLoading(true);
                            loadCategories();
                        }}
                    />
                </View>
            ) : categories.length === 0 ? (
                <View style={styles.empty}>
                    <BedDouble size={32} color={C.gray} />

                    <TextField
                        label="Aún no tienes categorías"
                        size="md"
                        weight="semibold"
                        align="center"
                    />

                    <TextField
                        label="Crea categorías como Individual, Matrimonial, Doble o Suite."
                        size="xs"
                        color="gray"
                        align="center"
                    />

                    <Button
                        text="Crear primera categoría"
                        onPress={openCreate}
                    />
                </View>
            ) : (
                <View style={styles.list}>
                    {categories.map(item => (
                        <CategoryCard
                            key={item.id}
                            item={item}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </View>
            )}

            <CategorySheet
                visible={sheetVisible}
                editing={editing}
                form={form}
                setForm={setForm}
                saving={saving}
                onClose={closeSheet}
                onSave={handleSave}
            />
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    list: {
        gap: 12,
    },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        backgroundColor: C.white,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.light,
    },
    cardContent: {
        flex: 1,
        gap: 6,
    },
    capacity: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    actions: {
        flexDirection: "row",
        gap: 2,
    },
    actionButton: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    empty: {
        padding: 28,
        gap: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        backgroundColor: C.white,
    },
    modalRoot: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: C.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
        maxHeight: "88%",
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 22,
    },
    sheetBody: {
        gap: 20,
        paddingBottom: 12,
    },
    field: {
        gap: 9,
    },
    input: {
        minHeight: 52,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        backgroundColor: C.white,
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: C.black,
    },
    multiline: {
        minHeight: 100,
    },
});