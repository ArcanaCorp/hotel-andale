
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
    ArrowLeft,
    CalendarDays,
    Check,
    ChevronDown,
    ClipboardList,
    History,
    Hotel,
    Save,
    Search,
    UserRound,
    XCircle,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";

import { tokens } from "../../styles/tokens";

import {
    getGuestDetail,
    updateGuest,
} from "../../database/repositories/guests.repository";

import { consultDni } from "../../services/dni.service";

const C = tokens.colors;

const DOCUMENT_TYPES = [
    { value: "DNI", label: "DNI" },
    { value: "CE", label: "Carné de extranjería" },
    { value: "PASSPORT", label: "Pasaporte" },
    { value: "OTHER", label: "Otro documento" },
];

const SEX_OPTIONS = [
    { value: "M", label: "Masculino" },
    { value: "F", label: "Femenino" },
];

function parseDate(value) {
    if (!value) return null;

    const [year, month, day] = value
        .split("-")
        .map(Number);

    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    ) ? date : null;
}

function formatDate(date) {
    if (!date) return "Seleccionar fecha";

    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatLastVisit(value) {
    if (!value) return "Sin visitas";

    const [date] = value.split("T");
    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;
}

function Field({ label, children }) {
    return (
        <View style={styles.field}>
            <TextField
                label={label}
                size="sm"
                weight="medium"
            />
            {children}
        </View>
    );
}

function MetricCard({ icon: Icon, value, label }) {
    return (
        <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
                <Icon size={19} color={C.primary} />
            </View>

            <TextField
                label={String(value)}
                size="2xl"
                weight="bold"
            />

            <TextField
                label={label}
                size="xs"
                color="gray"
            />
        </View>
    );
}

export default function GuestDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const guestId = Number(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [consulting, setConsulting] = useState(false);

    const [guest, setGuest] = useState(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [documentType, setDocumentType] =
        useState("DNI");
    const [documentNumber, setDocumentNumber] =
        useState("");

    const [nationality, setNationality] =
        useState("Peruana");

    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [birthDate, setBirthDate] = useState(null);
    const [sex, setSex] = useState("");
    const [origin, setOrigin] = useState("");
    const [notes, setNotes] = useState("");

    const [documentSheet, setDocumentSheet] =
        useState(false);
    const [sexSheet, setSexSheet] = useState(false);
    const [showDatePicker, setShowDatePicker] =
        useState(false);

    const [editing, setEditing] = useState(false);

    const fillForm = data => {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setDocumentType(data.document_type || "DNI");
        setDocumentNumber(data.document_number || "");
        setNationality(data.nationality || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setBirthDate(parseDate(data.birth_date));
        setSex(data.sex || "");
        setOrigin(data.origin || "");
        setNotes(data.notes || "");
    };

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                setLoading(true);

                try {
                    if (
                        !Number.isSafeInteger(guestId) ||
                        guestId <= 0
                    ) {
                        throw new Error(
                            "Identificador de huésped inválido."
                        );
                    }

                    const result =
                        await getGuestDetail(guestId);

                    if (!result) {
                        throw new Error(
                            "No se encontró al huésped."
                        );
                    }

                    if (!active) return;

                    setGuest(result);
                    fillForm(result);
                    setEditing(false);
                } catch (error) {
                    if (active) {
                        Alert.alert(
                            "Error",
                            error?.message ||
                                "No se pudo cargar al huésped."
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
        }, [guestId])
    );

    const selectedDocument = DOCUMENT_TYPES.find(
        item => item.value === documentType
    );

    const selectedSex = SEX_OPTIONS.find(
        item => item.value === sex
    );

    const handleConsultDni = async () => {
        if (consulting) return;

        if (documentType !== "DNI") {
            Alert.alert(
                "Documento",
                "La consulta automática está disponible para DNI."
            );
            return;
        }

        if (!/^\d{8}$/.test(documentNumber.trim())) {
            Alert.alert(
                "DNI inválido",
                "Ingresa un DNI de 8 dígitos."
            );
            return;
        }

        setConsulting(true);

        try {
            const person = await consultDni(
                documentNumber.trim()
            );

            setFirstName(person.firstName || "");
            setLastName(person.lastName || "");
            setNationality("Peruana");
        } catch (error) {
            Alert.alert(
                "No se pudo consultar",
                error?.message ||
                    "No se pudo recuperar la información."
            );
        } finally {
            setConsulting(false);
        }
    };

    const handleSave = async () => {
        if (saving) return;

        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert(
                "Datos incompletos",
                "Ingresa los nombres y apellidos."
            );
            return;
        }

        if (!documentNumber.trim()) {
            Alert.alert(
                "Documento requerido",
                "Ingresa el número de documento."
            );
            return;
        }

        if (
            email.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            Alert.alert(
                "Correo inválido",
                "Verifica el correo electrónico."
            );
            return;
        }

        setSaving(true);

        try {
            const formattedBirthDate = birthDate
                ? [
                    birthDate.getFullYear(),
                    String(
                        birthDate.getMonth() + 1
                    ).padStart(2, "0"),
                    String(
                        birthDate.getDate()
                    ).padStart(2, "0"),
                ].join("-")
                : null;

            await updateGuest(guestId, {
                firstName,
                lastName,
                documentType,
                documentNumber,
                nationality,
                phone,
                email,
                birthDate: formattedBirthDate,
                sex,
                origin,
                notes,
            });

            const updated =
                await getGuestDetail(guestId);

            setGuest(updated);
            fillForm(updated);
            setEditing(false);

            Alert.alert(
                "Huésped actualizado",
                "Los cambios se guardaron correctamente."
            );
        } catch (error) {
            Alert.alert(
                "No se pudo guardar",
                error?.message || "Ocurrió un error."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (guest) fillForm(guest);
        setEditing(false);
    };

    if (loading) {
        return (
            <ScreenTab>
                <View style={styles.loading}>
                    <ActivityIndicator
                        size="large"
                        color={C.primary}
                    />
                    <TextField
                        label="Cargando huésped..."
                        color="gray"
                    />
                </View>
            </ScreenTab>
        );
    }

    if (!guest) {
        return (
            <ScreenTab>
                <TextField
                    label="No se pudo cargar el huésped."
                    size="md"
                />
                <Button
                    text="Volver"
                    onPress={() => router.back()}
                />
            </ScreenTab>
        );
    }

    return (
        <ScreenTab>
            {/* ENCABEZADO */}
            <View style={styles.header}>
                <Button
                    icon={ArrowLeft}
                    iconOnly
                    variant="ghost"
                    onPress={() => router.back()}
                />

                <View style={{ flex: 1, gap: 4 }}>
                    <TextField
                        label="Detalle de huésped"
                        size="xl"
                        weight="bold"
                    />
                    <TextField
                        label={`Registro #${guest.id}`}
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            {/* PERFIL */}
            <View style={styles.profile}>
                <View style={styles.avatar}>
                    <UserRound
                        size={32}
                        color={C.primary}
                    />
                </View>

                <TextField
                    label={
                        `${guest.first_name} ${guest.last_name}`
                    }
                    size="lg"
                    weight="bold"
                    style={{ textAlign: "center" }}
                />

                <TextField
                    label={
                        `${guest.document_type || "Documento"} · ${guest.document_number || "Sin número"}`
                    }
                    size="sm"
                    color="gray"
                />

                {!!guest.nationality && (
                    <View style={styles.nationalityBadge}>
                        <TextField
                            label={guest.nationality}
                            size="xs"
                            weight="medium"
                        />
                    </View>
                )}
            </View>

            {/* MÉTRICAS */}
            <View style={styles.section}>
                <TextField
                    label="Actividad del huésped"
                    size="lg"
                    weight="bold"
                />

                <View style={styles.metricGrid}>
                    <MetricCard
                        icon={ClipboardList}
                        value={guest.total_reservations || 0}
                        label="Reservas realizadas"
                    />

                    <MetricCard
                        icon={CalendarDays}
                        value={guest.active_reservations || 0}
                        label="Reservas vigentes"
                    />

                    <MetricCard
                        icon={Hotel}
                        value={guest.completed_stays || 0}
                        label="Estadías completadas"
                    />

                    <MetricCard
                        icon={XCircle}
                        value={guest.cancelled_reservations || 0}
                        label="Reservas canceladas"
                    />
                </View>

                <View style={styles.visitCard}>
                    <History
                        size={20}
                        color={C.primary}
                    />

                    <View style={{ flex: 1, gap: 4 }}>
                        <TextField
                            label="Última visita"
                            size="xs"
                            color="gray"
                        />
                        <TextField
                            label={formatLastVisit(
                                guest.last_visit
                            )}
                            size="sm"
                            weight="semibold"
                        />
                    </View>

                    {Number(guest.current_stays) > 0 && (
                        <View style={styles.activeBadge}>
                            <TextField
                                label="Hospedado"
                                size="xs"
                                weight="semibold"
                                style={{ color: "#15803d" }}
                            />
                        </View>
                    )}
                </View>
            </View>

            {/* DATOS PERSONALES */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <TextField
                        label="Datos personales"
                        size="lg"
                        weight="bold"
                    />

                    {!editing && (
                        <Button
                            text="Editar"
                            variant="link"
                            size="sm"
                            onPress={() => setEditing(true)}
                            fullWidth={false}
                        />
                    )}
                </View>

                <Field label="Nombres">
                    <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        editable={editing}
                        placeholder="Nombres"
                        placeholderTextColor={C.gray}
                        style={[
                            styles.input,
                            !editing && styles.readOnly,
                        ]}
                    />
                </Field>

                <Field label="Apellidos">
                    <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        editable={editing}
                        placeholder="Apellidos"
                        placeholderTextColor={C.gray}
                        style={[
                            styles.input,
                            !editing && styles.readOnly,
                        ]}
                    />
                </Field>

                <Field label="Tipo de documento">
                    <Pressable
                        disabled={!editing}
                        onPress={() =>
                            setDocumentSheet(true)
                        }
                        style={[
                            styles.select,
                            !editing && styles.readOnly,
                        ]}
                    >
                        <TextField
                            label={
                                selectedDocument?.label ||
                                "Seleccionar"
                            }
                            size="sm"
                        />

                        {editing && (
                            <ChevronDown
                                size={18}
                                color={C.gray}
                            />
                        )}
                    </Pressable>
                </Field>

                <Field label="Número de documento">
                    <View style={styles.documentRow}>
                        <TextInput
                            value={documentNumber}
                            onChangeText={value => {
                                setDocumentNumber(
                                    documentType === "DNI"
                                        ? value.replace(
                                            /\D/g,
                                            ""
                                        ).slice(0, 8)
                                        : value
                                );
                            }}
                            editable={editing}
                            keyboardType={
                                documentType === "DNI"
                                    ? "number-pad"
                                    : "default"
                            }
                            placeholder="Documento"
                            placeholderTextColor={C.gray}
                            style={[
                                styles.input,
                                { flex: 1 },
                                !editing && styles.readOnly,
                            ]}
                        />

                        {editing && documentType === "DNI" && (
                            <Pressable
                                onPress={handleConsultDni}
                                disabled={consulting}
                                style={styles.searchButton}
                            >
                                {consulting ? (
                                    <ActivityIndicator
                                        color={C.white}
                                    />
                                ) : (
                                    <Search
                                        size={20}
                                        color={C.white}
                                    />
                                )}
                            </Pressable>
                        )}
                    </View>
                </Field>

                <Field label="Nacionalidad">
                    <TextInput
                        value={nationality}
                        onChangeText={setNationality}
                        editable={
                            editing && documentType !== "DNI"
                        }
                        placeholder="Nacionalidad"
                        placeholderTextColor={C.gray}
                        style={[
                            styles.input,
                            (!editing ||
                                documentType === "DNI") &&
                                styles.readOnly,
                        ]}
                    />
                </Field>

                <Field label="Fecha de nacimiento">
                    <Pressable
                        disabled={!editing}
                        onPress={() =>
                            setShowDatePicker(true)
                        }
                        style={[
                            styles.select,
                            !editing && styles.readOnly,
                        ]}
                    >
                        <TextField
                            label={formatDate(birthDate)}
                            size="sm"
                        />

                        {editing && (
                            <CalendarDays
                                size={18}
                                color={C.gray}
                            />
                        )}
                    </Pressable>
                </Field>

                <Field label="Sexo">
                    <Pressable
                        disabled={!editing}
                        onPress={() => setSexSheet(true)}
                        style={[
                            styles.select,
                            !editing && styles.readOnly,
                        ]}
                    >
                        <TextField
                            label={
                                selectedSex?.label ||
                                "Sin especificar"
                            }
                            size="sm"
                        />

                        {editing && (
                            <ChevronDown
                                size={18}
                                color={C.gray}
                            />
                        )}
                    </Pressable>
                </Field>

                <Field label="Procedencia">
                    <TextInput
                        value={origin}
                        onChangeText={setOrigin}
                        editable={editing}
                        placeholder="Ciudad o lugar de procedencia"
                        placeholderTextColor={C.gray}
                        style={[
                            styles.input,
                            !editing && styles.readOnly,
                        ]}
                    />
                </Field>
            </View>

            {/* CONTACTO */}
            <View style={styles.section}>
                <TextField
                    label="Información de contacto"
                    size="lg"
                    weight="bold"
                />

                <Field label="Teléfono">
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        editable={editing}
                        keyboardType="phone-pad"
                        placeholder="Número de teléfono"
                        placeholderTextColor={C.gray}
                        style={[
                            styles.input,
                            !editing && styles.readOnly,
                        ]}
                    />
                </Field>

                <Field label="Correo electrónico">
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        editable={editing}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="correo@ejemplo.com"
                        placeholderTextColor={C.gray}
                        style={[
                            styles.input,
                            !editing && styles.readOnly,
                        ]}
                    />
                </Field>
            </View>

            {/* OBSERVACIONES */}
            <View style={styles.section}>
                <TextField
                    label="Observaciones"
                    size="lg"
                    weight="bold"
                />

                <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    editable={editing}
                    multiline
                    textAlignVertical="top"
                    placeholder="Observaciones del huésped"
                    placeholderTextColor={C.gray}
                    style={[
                        styles.input,
                        styles.textarea,
                        !editing && styles.readOnly,
                    ]}
                />
            </View>

            {/* ACCIONES */}
            {editing && (
                <View style={styles.actions}>
                    <Button
                        text="Guardar cambios"
                        icon={Save}
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving}
                        fullWidth
                    />

                    <Button
                        text="Descartar cambios"
                        variant="secondary"
                        onPress={handleCancelEdit}
                        disabled={saving}
                        fullWidth
                    />
                </View>
            )}

            {/* SELECTOR DE DOCUMENTO */}
            <BottomSheet
                visible={documentSheet}
                title="Tipo de documento"
                onClose={() => setDocumentSheet(false)}
            >
                <View style={styles.sheetContent}>
                    {DOCUMENT_TYPES.map(item => (
                        <Pressable
                            key={item.value}
                            style={styles.sheetOption}
                            onPress={() => {
                                if (
                                    documentType !== item.value
                                ) {
                                    setDocumentType(item.value);
                                    setDocumentNumber("");
                                    if (item.value === "DNI") {
                                        setNationality("Peruana");
                                    }
                                }
                                setDocumentSheet(false);
                            }}
                        >
                            <TextField
                                label={item.label}
                                size="sm"
                            />

                            {documentType === item.value && (
                                <Check
                                    size={19}
                                    color={C.primary}
                                />
                            )}
                        </Pressable>
                    ))}
                </View>
            </BottomSheet>

            {/* SELECTOR DE SEXO */}
            <BottomSheet
                visible={sexSheet}
                title="Sexo"
                onClose={() => setSexSheet(false)}
            >
                <View style={styles.sheetContent}>
                    {SEX_OPTIONS.map(item => (
                        <Pressable
                            key={item.value}
                            style={styles.sheetOption}
                            onPress={() => {
                                setSex(item.value);
                                setSexSheet(false);
                            }}
                        >
                            <TextField
                                label={item.label}
                                size="sm"
                            />

                            {sex === item.value && (
                                <Check
                                    size={19}
                                    color={C.primary}
                                />
                            )}
                        </Pressable>
                    ))}
                </View>
            </BottomSheet>

            {/* FECHA DE NACIMIENTO */}
            {showDatePicker && (
                <DateTimePicker
                    value={birthDate || new Date(2000, 0, 1)}
                    mode="date"
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                        setShowDatePicker(false);

                        if (
                            event.type === "set" &&
                            date
                        ) {
                            setBirthDate(date);
                        }
                    }}
                />
            )}
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
    profile: {
        alignItems: "center",
        gap: 10,
        paddingVertical: 15,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    nationalityBadge: {
        backgroundColor: C.light,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    section: {
        gap: 15,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    metricGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    metricCard: {
        width: "48%",
        flexGrow: 1,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.white,
        borderRadius: 14,
        padding: 15,
        gap: 8,
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: C.light,
        alignItems: "center",
        justifyContent: "center",
    },
    visitCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 15,
        backgroundColor: C.white,
    },
    activeBadge: {
        backgroundColor: "#dcfce7",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
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
        color: C.black,
        fontSize: 14,
    },
    readOnly: {
        backgroundColor: C.light,
    },
    textarea: {
        minHeight: 100,
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
    documentRow: {
        flexDirection: "row",
        gap: 8,
    },
    searchButton: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: C.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    actions: {
        gap: 12,
        paddingBottom: 20,
    },
    sheetContent: {
        paddingBottom: 16,
    },
    sheetOption: {
        minHeight: 54,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
});