
import { useCallback, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { Image } from "expo-image";

import {
    useFocusEffect,
    useRouter,
} from "expo-router";

import {
    ArrowLeft,
    Building2,
    Camera,
    FileText,
    MapPin,
    Pencil,
    Phone,
    ShieldCheck,
    Trash2,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    getHotelDetails,
    updateHotelDetails,
} from "../../database/repositories/hotel.repository";

import {
    selectHotelLogo,
    deleteHotelLogo,
} from "../../services/hotel-logo.service";

const C = tokens.colors;

const SECTIONS = {
    commercial: {
        title: "Información comercial",
        icon: Building2,
        fields: [
            {
                key: "name",
                label: "Nombre del hotel",
                required: true,
            },
            {
                key: "nombre_comercial",
                label: "Nombre comercial",
            },
            {
                key: "razon_social",
                label: "Razón social",
            },
            {
                key: "tipo_establecimiento",
                label: "Tipo de establecimiento",
            },
        ],
    },

    tax: {
        title: "Información tributaria",
        icon: FileText,
        fields: [
            {
                key: "ruc",
                label: "RUC",
                keyboardType: "number-pad",
            },
            {
                key: "estado_ruc",
                label: "Estado del RUC",
            },
            {
                key: "condicion_ruc",
                label: "Condición del RUC",
            },
            {
                key: "domicilio_fiscal",
                label: "Domicilio fiscal",
                multiline: true,
            },
        ],
    },

    location: {
        title: "Ubicación",
        icon: MapPin,
        fields: [
            {
                key: "direccion",
                label: "Dirección",
                multiline: true,
            },
            {
                key: "departamento",
                label: "Departamento",
            },
            {
                key: "provincia",
                label: "Provincia",
            },
            {
                key: "distrito",
                label: "Distrito",
            },
        ],
    },

    contact: {
        title: "Contacto",
        icon: Phone,
        fields: [
            {
                key: "telefono",
                label: "Teléfono",
                keyboardType: "phone-pad",
            },
            {
                key: "email",
                label: "Correo electrónico",
                keyboardType: "email-address",
            },
        ],
    },

    records: {
        title: "Registros y autorizaciones",
        icon: ShieldCheck,
        fields: [
            {
                key: "licencia_municipal",
                label: "Licencia municipal",
            },
            {
                key: "registro_hospedaje",
                label: "Registro de hospedaje",
            },
        ],
    },
};

function Detail({ label, value }) {
    const display =
        value === null ||
        value === undefined ||
        String(value).trim() === ""
            ? "No registrado"
            : String(value);

    return (
        <View style={styles.detail}>
            <TextField
                label={label}
                size="xs"
                color="gray"
            />

            <TextField
                label={display}
                size="sm"
                weight="medium"
            />
        </View>
    );
}

function SectionCard({
    section,
    hotel,
    onEdit,
}) {
    const Icon = section.icon;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                    <Icon
                        size={20}
                        color={C.primary}
                    />

                    <TextField
                        label={section.title}
                        size="md"
                        weight="bold"
                    />
                </View>

                <Button
                    icon={Pencil}
                    iconOnly
                    variant="ghost"
                    onPress={onEdit}
                />
            </View>

            <View style={styles.details}>
                {section.fields.map(field => (
                    <Detail
                        key={field.key}
                        label={field.label}
                        value={hotel?.[field.key]}
                    />
                ))}
            </View>
        </View>
    );
}

export default function HotelScreen() {
    const router = useRouter();

    const [hotel, setHotel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeSection, setActiveSection] =
        useState(null);

    const [form, setForm] = useState({});
    const [logoSheet, setLogoSheet] = useState(false);

    const load = useCallback(async () => {
        try {
            const result = await getHotelDetails();

            if (!result) {
                throw new Error(
                    "No se encontró la información del hotel."
                );
            }

            setHotel(result);
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message ||
                    "No se pudo cargar el hotel."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const openEditor = key => {
        const section = SECTIONS[key];
        const values = {};

        section.fields.forEach(field => {
            values[field.key] =
                String(hotel?.[field.key] ?? "");
        });

        setForm(values);
        setActiveSection(key);
    };

    const closeEditor = () => {
        if (saving) return;

        setActiveSection(null);
        setForm({});
    };

    const handleSave = async () => {
        if (!activeSection || saving) return;

        const section = SECTIONS[activeSection];

        for (const field of section.fields) {
            if (
                field.required &&
                !String(form[field.key] || "").trim()
            ) {
                Alert.alert(
                    "Campo obligatorio",
                    `Completa ${field.label}.`
                );
                return;
            }
        }

        setSaving(true);

        try {
            const updated =
                await updateHotelDetails(form);

            setHotel(updated);
            setActiveSection(null);
            setForm({});
        } catch (error) {
            Alert.alert(
                "Error al guardar",
                error?.message ||
                    "No se pudieron guardar los cambios."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChangeLogo = async () => {
        if (saving) return;

        let newUri = null;

        setSaving(true);

        try {
            newUri = await selectHotelLogo();

            if (!newUri) return;

            const previousUri = hotel?.logo_uri;

            const updated = await updateHotelDetails({
                logo_uri: newUri,
            });

            setHotel(updated);
            setLogoSheet(false);

            if (
                previousUri &&
                previousUri !== newUri
            ) {
                await deleteHotelLogo(previousUri)
                    .catch(() => {});
            }
        } catch (error) {
            if (newUri) {
                await deleteHotelLogo(newUri)
                    .catch(() => {});
            }

            Alert.alert(
                "No se pudo cambiar el logo",
                error?.message ||
                    "Ocurrió un error."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveLogo = () => {
        if (!hotel?.logo_uri || saving) return;

        Alert.alert(
            "Eliminar logo",
            "¿Deseas quitar la imagen del hotel?",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        setSaving(true);

                        try {
                            const previousUri =
                                hotel.logo_uri;

                            const updated =
                                await updateHotelDetails({
                                    logo_uri: null,
                                });

                            setHotel(updated);
                            setLogoSheet(false);

                            await deleteHotelLogo(previousUri)
                                .catch(() => {});
                        } catch (error) {
                            Alert.alert(
                                "Error",
                                error?.message ||
                                    "No se pudo eliminar el logo."
                            );
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const currentSection = activeSection
        ? SECTIONS[activeSection]
        : null;

    if (loading) {
        return (
            <ScreenTab>
                <View style={styles.loading}>
                    <ActivityIndicator
                        size="large"
                        color={C.primary}
                    />
                </View>
            </ScreenTab>
        );
    }

    return (
        <ScreenTab>
            <View style={styles.header}>
                <Button
                    icon={ArrowLeft}
                    iconOnly
                    variant="ghost"
                    onPress={() => router.back()}
                />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="Datos del hotel"
                        size="xl"
                        weight="bold"
                    />

                    <TextField
                        label="Información del establecimiento"
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {hotel && (
                <>
                    <View style={styles.profile}>
                        <Pressable
                            style={styles.logoContainer}
                            onPress={() =>
                                setLogoSheet(true)
                            }
                        >
                            {hotel.logo_uri ? (
                                <Image
                                    source={{
                                        uri: hotel.logo_uri,
                                    }}
                                    style={styles.logo}
                                    contentFit="cover"
                                />
                            ) : (
                                <Building2
                                    size={34}
                                    color={C.primary}
                                />
                            )}

                            <View style={styles.cameraBadge}>
                                <Camera
                                    size={13}
                                    color={C.white}
                                />
                            </View>
                        </Pressable>

                        <View style={{
                            flex: 1,
                            gap: 6,
                        }}>
                            <TextField
                                label={
                                    hotel.nombre_comercial ||
                                    hotel.name
                                }
                                size="lg"
                                weight="bold"
                            />

                            <TextField
                                label={
                                    hotel.ruc
                                        ? `RUC ${hotel.ruc}`
                                        : "RUC no registrado"
                                }
                                size="xs"
                                color="gray"
                            />

                            <TextField
                                label={
                                    [
                                        hotel.distrito,
                                        hotel.provincia,
                                        hotel.departamento,
                                    ]
                                        .filter(Boolean)
                                        .join(", ") ||
                                    "Ubicación no registrada"
                                }
                                size="xs"
                                color="gray"
                            />
                        </View>
                    </View>

                    {Object.entries(SECTIONS).map(
                        ([key, section]) => (
                            <SectionCard
                                key={key}
                                section={section}
                                hotel={hotel}
                                onEdit={() =>
                                    openEditor(key)
                                }
                            />
                        )
                    )}
                </>
            )}

            {/* EDITAR INFORMACIÓN */}
            <BottomSheet
                visible={!!activeSection}
                title={currentSection?.title || "Editar"}
                busy={saving}
                onClose={closeEditor}
            >
                <View style={styles.sheet}>
                    {currentSection?.fields.map(field => (
                        <View
                            key={field.key}
                            style={styles.formField}
                        >
                            <TextField
                                label={
                                    field.label +
                                    (field.required
                                        ? " *"
                                        : "")
                                }
                                size="sm"
                                weight="medium"
                            />

                            <TextInput
                                value={
                                    form[field.key] || ""
                                }
                                onChangeText={value =>
                                    setForm(previous => ({
                                        ...previous,
                                        [field.key]: value,
                                    }))
                                }
                                placeholder={
                                    `Ingresa ${field.label.toLowerCase()}`
                                }
                                keyboardType={
                                    field.keyboardType ||
                                    "default"
                                }
                                autoCapitalize={
                                    field.key === "email"
                                        ? "none"
                                        : "sentences"
                                }
                                multiline={
                                    !!field.multiline
                                }
                                style={[
                                    styles.input,
                                    field.multiline &&
                                        styles.multiline,
                                ]}
                            />
                        </View>
                    ))}

                    <Button
                        text="Guardar cambios"
                        loading={saving}
                        disabled={saving}
                        onPress={handleSave}
                    />

                    <Button
                        text="Cancelar"
                        variant="secondary"
                        disabled={saving}
                        onPress={closeEditor}
                    />
                </View>
            </BottomSheet>

            {/* CAMBIAR LOGO */}
            <BottomSheet
                visible={logoSheet}
                title="Logo del hotel"
                busy={saving}
                onClose={() => setLogoSheet(false)}
            >
                <View style={styles.sheet}>
                    <View style={styles.logoPreview}>
                        {hotel?.logo_uri ? (
                            <Image
                                source={{
                                    uri: hotel.logo_uri,
                                }}
                                style={styles.previewImage}
                                contentFit="contain"
                            />
                        ) : (
                            <Building2
                                size={50}
                                color={C.gray}
                            />
                        )}
                    </View>

                    <Button
                        text={
                            hotel?.logo_uri
                                ? "Cambiar imagen"
                                : "Seleccionar imagen"
                        }
                        icon={Camera}
                        onPress={handleChangeLogo}
                        loading={saving}
                    />

                    {!!hotel?.logo_uri && (
                        <Button
                            text="Eliminar logo"
                            icon={Trash2}
                            variant="danger-soft"
                            disabled={saving}
                            onPress={handleRemoveLogo}
                        />
                    )}
                </View>
            </BottomSheet>
        </ScreenTab>
    );
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: 60,
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    profile: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        backgroundColor: tokens.colors.white,
    },
    logoContainer: {
        width: 84,
        height: 84,
        borderRadius: 18,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    logo: {
        width: "100%",
        height: "100%",
    },
    cameraBadge: {
        position: "absolute",
        right: 5,
        bottom: 5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: C.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    card: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 16,
        gap: 16,
        backgroundColor: tokens.colors.white,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardTitle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    details: {
        gap: 16,
    },
    detail: {
        gap: 5,
    },
    sheet: {
        gap: 18,
        paddingBottom: 20,
    },
    formField: {
        gap: 8,
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        color: C.black,
        backgroundColor: C.white,
    },
    multiline: {
        minHeight: 95,
        paddingTop: 14,
        textAlignVertical: "top",
    },
    logoPreview: {
        height: 190,
        borderRadius: 16,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
});