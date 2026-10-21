import { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
    Building2,
    Camera,
    Search,
    CheckCircle2,
    ArrowRight,
    ShieldCheck,
    MapPin,
    WifiOff,
} from "lucide-react-native";

import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";

const API_URL = "https://utilities.arcanacorp.dev";

const INITIAL = {
    ruc: "",
    razonSocial: "",
    nombreComercial: "",
    estadoRuc: "",
    condicionRuc: "",
    nombreHotel: "",
    tipoEstablecimiento: "",
    direccion: "",
    departamento: "",
    provincia: "",
    distrito: "",
    telefono: "",
    email: "",
    logoUri: "",
    licenciaMunicipal: "",
    registroHospedaje: "",
};

const TIPOS = [
    "Hotel",
    "Hostal",
    "Hospedaje",
    "Apart-hotel",
    "Albergue",
    "Otro",
];

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    editable = true,
    required = false,
    multiline = false,
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <TextInput
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    !editable && styles.readonly,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#a1a1aa"
                keyboardType={keyboardType}
                editable={editable}
                multiline={multiline}
                autoCapitalize={
                    keyboardType === "email-address"
                        ? "none"
                        : "sentences"
                }
            />
        </View>
    );
}

function Section({ number, title, description, children }) {
    return (
        <View style={styles.card}>
            <View style={styles.sectionTitle}>
                <View style={styles.step}>
                    <Text style={styles.stepText}>{number}</Text>
                </View>
                <Text style={styles.sectionHeading}>{title}</Text>
            </View>

            {description ? (
                <Text style={styles.description}>{description}</Text>
            ) : null}

            {children}
        </View>
    );
}

export default function Onboarding({ onComplete }) {
    const [form, setForm] = useState(INITIAL);
    const [loadingRuc, setLoadingRuc] = useState(false);
    const [saving, setSaving] = useState(false);
    const [consultado, setConsultado] = useState(false);
    const [consultaFecha, setConsultaFecha] = useState(null);
    const [aceptaDeclaracion, setAceptaDeclaracion] = useState(false);

    function update(key, value) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    function changeRuc(value) {
        setForm(prev => ({
            ...prev,
            ruc: value.replace(/\D/g, "").slice(0, 11),
            razonSocial: "",
            nombreComercial: "",
            estadoRuc: "",
            condicionRuc: "",
        }));
        setConsultado(false);
        setConsultaFecha(null);
    }

    async function consultarRuc() {
        const ruc = form.ruc.trim();

        if (!/^(10|20)\d{9}$/.test(ruc)) {
            Alert.alert(
                "RUC inválido",
                "Ingresa un RUC peruano de 11 dígitos que comience en 10 o 20."
            );
            return;
        }

        setLoadingRuc(true);
        setConsultado(false);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(),
                12000
            );

            let response;

            try {
                response = await fetch(
                    `${API_URL}/ruc/${encodeURIComponent(ruc)}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    }
                );
            } finally {
                clearTimeout(timeout);
            }

            const result = await response.json();

            if (!response.ok || !result.success || !result.data) {
                throw new Error(
                    result?.error?.message ||
                    "No se pudo consultar el RUC."
                );
            }

            const data = result.data;

            if (data.ruc !== ruc) {
                throw new Error(
                    "El RUC devuelto no coincide con el consultado."
                );
            }

            setForm(prev => ({
                ...prev,
                razonSocial: data.razonSocial || "",
                nombreComercial: data.nombreComercial || "",
                estadoRuc: data.estado || "",
                condicionRuc: data.condicion || "",
                nombreHotel:
                    prev.nombreHotel ||
                    data.nombreComercial ||
                    "",
                direccion:
                    prev.direccion ||
                    data.direccion ||
                    "",
                departamento:
                    prev.departamento ||
                    data.departamento ||
                    "",
                provincia:
                    prev.provincia ||
                    data.provincia ||
                    "",
                distrito:
                    prev.distrito ||
                    data.distrito ||
                    "",
                telefono:
                    prev.telefono ||
                    data.telefonos?.[0] ||
                    "",
            }));

            setConsultado(true);
            setConsultaFecha(new Date().toISOString());
        } catch (error) {
            Alert.alert(
                "Consulta no disponible",
                error?.name === "AbortError"
                    ? "La consulta tardó demasiado. Puedes intentar nuevamente o completar los datos manualmente."
                    : `${error.message}\n\nPuedes completar los datos manualmente.`
            );
        } finally {
            setLoadingRuc(false);
        }
    }

    async function seleccionarLogo() {
        try {
            const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    "Permiso necesario",
                    "Autoriza el acceso a tus imágenes para seleccionar el logo."
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            update("logoUri", result.assets[0].uri);
        } catch {
            Alert.alert(
                "Error",
                "No se pudo seleccionar el logo."
            );
        }
    }

    async function guardarLogoLocal(uri) {
        if (!uri) return "";

        const directory =
            FileSystem.documentDirectory + "hotel/";

        await FileSystem.makeDirectoryAsync(directory, {
            intermediates: true,
        });

        const destination = directory + "logo.jpg";

        await FileSystem.copyAsync({
            from: uri,
            to: destination,
        });

        return destination;
    }

    async function continuar() {
        if (saving) return;

        if (!/^(10|20)\d{9}$/.test(form.ruc)) {
            Alert.alert(
                "RUC requerido",
                "Ingresa un RUC válido de 11 dígitos."
            );
            return;
        }

        if (!form.razonSocial.trim()) {
            Alert.alert(
                "Datos legales",
                "Ingresa la razón social o nombre legal del titular."
            );
            return;
        }

        if (!form.nombreHotel.trim()) {
            Alert.alert(
                "Nombre requerido",
                "Ingresa el nombre de tu establecimiento."
            );
            return;
        }

        if (
            !form.direccion.trim() ||
            !form.departamento.trim() ||
            !form.provincia.trim() ||
            !form.distrito.trim()
        ) {
            Alert.alert(
                "Ubicación incompleta",
                "Completa la dirección, departamento, provincia y distrito del establecimiento."
            );
            return;
        }

        if (!form.tipoEstablecimiento) {
            Alert.alert(
                "Tipo de establecimiento",
                "Selecciona el tipo de hospedaje."
            );
            return;
        }

        if (!aceptaDeclaracion) {
            Alert.alert(
                "Confirmación requerida",
                "Confirma que estás autorizado para registrar este establecimiento y que los datos son correctos."
            );
            return;
        }

        if (typeof onComplete !== "function") {
            Alert.alert(
                "Almacenamiento pendiente",
                "Debes conectar esta pantalla con el guardado local del perfil."
            );
            return;
        }

        setSaving(true);

        try {
            const logoUri = await guardarLogoLocal(
                form.logoUri
            );

            const profile = {
                ...form,
                logoUri,
                razonSocial: form.razonSocial.trim(),
                nombreHotel: form.nombreHotel.trim(),
                direccion: form.direccion.trim(),
                telefono: form.telefono.trim(),
                email: form.email.trim().toLowerCase(),
                consultaRuc: {
                    realizada: consultado,
                    fecha: consultaFecha,
                },
                createdAt: new Date().toISOString(),
            };

            await onComplete(profile);
        } catch (error) {
            Alert.alert(
                "No se pudo guardar",
                error?.message ||
                "Inténtalo nuevamente."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                >
                    <View style={styles.brandRow}>
                        <View style={styles.brandIcon}>
                            <Building2 size={22} color="#fff" />
                        </View>
                        <TextField
                            label="Hotel Ándale"
                            size="2xl"
                            weight="bold"
                        />
                    </View>

                    <View style={styles.header}>
                        <TextField
                            label="Configuremos tu hospedaje"
                            size="5xl"
                            weight="bold"
                        />
                        <TextField
                            label="Completa los datos de tu negocio para comenzar a administrar tu establecimiento."
                            size="sm"
                            color="gray"
                        />
                    </View>

                    <View style={styles.infoRow}>
                        <WifiOff size={17} color="#52525b" />
                        <Text style={styles.infoText}>
                            Tus datos se guardarán en este dispositivo.
                            La consulta de RUC requiere internet.
                        </Text>
                    </View>

                    <Section
                        number="1"
                        title="Datos del titular"
                        description="Identifica a la persona natural o empresa responsable del establecimiento."
                    >
                        <Field
                            label="RUC"
                            value={form.ruc}
                            onChangeText={changeRuc}
                            placeholder="Ingresa los 11 dígitos"
                            keyboardType="number-pad"
                            required
                        />

                        <Button
                            text={
                                loadingRuc
                                    ? "Consultando..."
                                    : "Consultar RUC"
                            }
                            icon={Search}
                            onPress={consultarRuc}
                            loading={loadingRuc}
                            disabled={
                                loadingRuc ||
                                form.ruc.length !== 11
                            }
                        />

                        {consultado && (
                            <View style={styles.successBox}>
                                <CheckCircle2
                                    size={18}
                                    color="#15803d"
                                />
                                <Text style={styles.successText}>
                                    Datos recuperados. Verifica que
                                    correspondan a tu negocio.
                                </Text>
                            </View>
                        )}

                        <Field
                            label="Razón social o nombre legal"
                            value={form.razonSocial}
                            onChangeText={v =>
                                update("razonSocial", v)
                            }
                            placeholder="Nombre registrado en SUNAT"
                            required
                        />

                        <Field
                            label="Nombre comercial registrado"
                            value={form.nombreComercial}
                            onChangeText={v =>
                                update("nombreComercial", v)
                            }
                            placeholder="Opcional"
                        />

                        {!!form.estadoRuc && (
                            <View style={styles.statusRow}>
                                <Text style={styles.statusText}>
                                    Estado: {form.estadoRuc}
                                </Text>
                                <Text style={styles.statusText}>
                                    Condición: {form.condicionRuc || "Sin dato"}
                                </Text>
                            </View>
                        )}

                        <Text style={styles.hint}>
                            La consulta RUC no acredita la titularidad
                            del establecimiento ni sus autorizaciones
                            de funcionamiento.
                        </Text>
                    </Section>

                    <Section
                        number="2"
                        title="Identidad del hospedaje"
                        description="Estos datos identificarán a tu establecimiento dentro de Hotel Ándale."
                    >
                        <Pressable
                            style={styles.logoPicker}
                            onPress={seleccionarLogo}
                        >
                            {form.logoUri ? (
                                <Image
                                    source={{ uri: form.logoUri }}
                                    style={styles.logo}
                                />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <Camera
                                        size={30}
                                        color="#71717a"
                                    />
                                </View>
                            )}

                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={styles.logoTitle}>
                                    {form.logoUri
                                        ? "Cambiar logo"
                                        : "Agregar logo"}
                                </Text>
                                <Text style={styles.description}>
                                    Selecciona una imagen cuadrada
                                    desde tu galería.
                                </Text>
                            </View>
                        </Pressable>

                        <Field
                            label="Nombre del establecimiento"
                            value={form.nombreHotel}
                            onChangeText={v =>
                                update("nombreHotel", v)
                            }
                            placeholder="Ej. Hospedaje Los Andes"
                            required
                        />

                        <Text style={styles.label}>
                            Tipo de establecimiento *
                        </Text>

                        <View style={styles.chips}>
                            {TIPOS.map(tipo => {
                                const active =
                                    form.tipoEstablecimiento === tipo;

                                return (
                                    <Pressable
                                        key={tipo}
                                        onPress={() =>
                                            update(
                                                "tipoEstablecimiento",
                                                tipo
                                            )
                                        }
                                        style={[
                                            styles.chip,
                                            active && styles.chipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                active &&
                                                styles.chipTextActive,
                                            ]}
                                        >
                                            {tipo}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.hint}>
                            Selecciona el tipo que corresponde a tu
                            establecimiento. Esta selección no
                            constituye una clasificación oficial
                            otorgada por MINCETUR.
                        </Text>
                    </Section>

                    <Section
                        number="3"
                        title="Ubicación y contacto"
                        description="Registra la dirección real donde se atiende a los huéspedes."
                    >
                        <View style={styles.locationHeader}>
                            <MapPin size={17} color="#71717a" />
                            <Text style={styles.description}>
                                La dirección del establecimiento puede
                                ser diferente al domicilio fiscal.
                            </Text>
                        </View>

                        <Field
                            label="Dirección"
                            value={form.direccion}
                            onChangeText={v =>
                                update("direccion", v)
                            }
                            placeholder="Calle, número y referencia"
                            required
                            multiline
                        />

                        <Field
                            label="Departamento"
                            value={form.departamento}
                            onChangeText={v =>
                                update("departamento", v)
                            }
                            placeholder="Ej. Junín"
                            required
                        />

                        <Field
                            label="Provincia"
                            value={form.provincia}
                            onChangeText={v =>
                                update("provincia", v)
                            }
                            placeholder="Ej. Jauja"
                            required
                        />

                        <Field
                            label="Distrito"
                            value={form.distrito}
                            onChangeText={v =>
                                update("distrito", v)
                            }
                            placeholder="Ej. Yauyos"
                            required
                        />

                        <Field
                            label="Teléfono de contacto"
                            value={form.telefono}
                            onChangeText={v =>
                                update("telefono", v)
                            }
                            placeholder="Número del establecimiento"
                            keyboardType="phone-pad"
                        />

                        <Field
                            label="Correo electrónico"
                            value={form.email}
                            onChangeText={v =>
                                update("email", v)
                            }
                            placeholder="reservas@tuhotel.com"
                            keyboardType="email-address"
                        />
                    </Section>

                    <Section
                        number="4"
                        title="Información administrativa"
                        description="Registra las referencias de tus documentos. No se verifican automáticamente."
                    >
                        <Field
                            label="Número de licencia municipal"
                            value={form.licenciaMunicipal}
                            onChangeText={v =>
                                update("licenciaMunicipal", v)
                            }
                            placeholder="Si corresponde"
                        />

                        <Field
                            label="Registro o constancia de hospedaje"
                            value={form.registroHospedaje}
                            onChangeText={v =>
                                update("registroHospedaje", v)
                            }
                            placeholder="Número o referencia"
                        />

                        <Text style={styles.hint}>
                            Hotel Ándale es una herramienta de
                            administración. Registrar estos datos
                            no reemplaza los trámites exigidos
                            por las autoridades.
                        </Text>
                    </Section>

                    <Pressable
                        style={styles.declarationRow}
                        onPress={() =>
                            setAceptaDeclaracion(v => !v)
                        }
                    >
                        <View
                            style={[
                                styles.checkbox,
                                aceptaDeclaracion &&
                                styles.checkboxChecked,
                            ]}
                        >
                            {aceptaDeclaracion && (
                                <CheckCircle2
                                    size={17}
                                    color="#fff"
                                />
                            )}
                        </View>

                        <Text style={styles.declarationText}>
                            Declaro que estoy autorizado para
                            configurar este establecimiento y
                            que la información proporcionada
                            es correcta.
                        </Text>
                    </Pressable>

                    <Button
                        text="Guardar y continuar"
                        icon={ShieldCheck}
                        rightIcon={ArrowRight}
                        onPress={continuar}
                        loading={saving}
                        disabled={saving || !aceptaDeclaracion}
                        size="lg"
                    />

                    <View style={styles.footer}>
                        <ShieldCheck
                            size={20}
                            color="#71717a"
                        />
                        <Text style={styles.footerText}>
                            Tu perfil se almacenará localmente.
                            Recuerda realizar copias de seguridad
                            para evitar perder la información.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#fafafa",
    },
    content: {
        width: "100%",
        maxWidth: 600,
        alignSelf: "center",
        padding: 24,
        paddingBottom: 60,
        gap: 20,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    brandIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#18181b",
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        gap: 8,
        marginTop: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 14,
        backgroundColor: "#f4f4f5",
        borderRadius: 12,
    },
    infoText: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#52525b",
        lineHeight: 19,
    },
    card: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e4e4e7",
        borderRadius: 20,
        padding: 20,
        gap: 16,
    },
    sectionTitle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    step: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: "#18181b",
        justifyContent: "center",
        alignItems: "center",
    },
    stepText: {
        color: "#fff",
        fontFamily: "Poppins-SemiBold",
        fontSize: 14,
    },
    sectionHeading: {
        flex: 1,
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#18181b",
    },
    description: {
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#71717a",
        lineHeight: 20,
    },
    field: {
        gap: 7,
    },
    label: {
        fontFamily: "Poppins-Medium",
        fontSize: 12,
        color: "#3f3f46",
    },
    required: {
        color: "#dc2626",
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: "#e4e4e7",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#18181b",
        backgroundColor: "#fff",
    },
    multiline: {
        minHeight: 76,
        textAlignVertical: "top",
    },
    readonly: {
        backgroundColor: "#f4f4f5",
    },
    successBox: {
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
        padding: 12,
        backgroundColor: "#f0fdf4",
        borderRadius: 12,
    },
    successText: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#166534",
    },
    statusRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    statusText: {
        fontFamily: "Poppins-Medium",
        fontSize: 11,
        color: "#52525b",
        backgroundColor: "#f4f4f5",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    hint: {
        fontFamily: "Poppins-Regular",
        fontSize: 11,
        color: "#71717a",
        lineHeight: 18,
    },
    logoPicker: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#d4d4d8",
        padding: 14,
        borderRadius: 14,
    },
    logoPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 14,
        backgroundColor: "#f4f4f5",
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 72,
        height: 72,
        borderRadius: 14,
    },
    logoTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 13,
        color: "#18181b",
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderColor: "#e4e4e7",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    chipActive: {
        backgroundColor: "#18181b",
        borderColor: "#18181b",
    },
    chipText: {
        fontFamily: "Poppins-Medium",
        fontSize: 12,
        color: "#52525b",
    },
    chipTextActive: {
        color: "#fff",
    },
    locationHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    declarationRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 8,
    },
    checkbox: {
        width: 23,
        height: 23,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: "#a1a1aa",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: "#18181b",
        borderColor: "#18181b",
    },
    declarationText: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#52525b",
        lineHeight: 20,
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
        paddingHorizontal: 4,
    },
    footerText: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#71717a",
        lineHeight: 20,
    },
});