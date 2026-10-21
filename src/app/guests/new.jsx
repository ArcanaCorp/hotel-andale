
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
    ChevronLeft,
    ChevronDown,
    Search,
    Check,
    CalendarDays,
    Info,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import BottomSheet from "../../components/ui/BottomSheet";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

import { consultDni } from "../../services/dni.service";
import { registerGuest } from "../../services/guests.service";
import { tokens } from "../../styles/tokens";

const C = {
    white: tokens.colors.white,
    black: tokens.colors.black,
    gray: tokens.colors.gray,
    border: tokens.colors.border,
    light: tokens.colors.light,
    primary: tokens.colors.primary,
};

const DOCUMENTS = [
    { value: "DNI", label: "DNI" },
    { value: "CE", label: "Carné de extranjería" },
    { value: "PASSPORT", label: "Pasaporte" },
    { value: "OTHER", label: "Otro documento" },
];

const COUNTRIES = [
    "Argentina",
    "Bolivia",
    "Brasil",
    "Chile",
    "Colombia",
    "Ecuador",
    "Estados Unidos",
    "España",
    "México",
    "Paraguay",
    "Perú",
    "Uruguay",
    "Venezuela",
];

const SEX_OPTIONS = [
    { value: "M", label: "Masculino" },
    { value: "F", label: "Femenino" },
];

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    editable = true,
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
                editable={editable}
                multiline={multiline}
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    !editable && styles.readOnly,
                ]}
            />
        </View>
    );
}

function SelectField({
    label,
    value,
    placeholder = "Seleccionar",
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
                style={styles.selector}
                onPress={onPress}
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

function Choice({ label, selected, onPress }) {
    return (
        <Pressable
            style={styles.choice}
            onPress={onPress}
        >
            <View style={{ flex: 1 }}>
                <TextField
                    label={label}
                    size="sm"
                    weight="semibold"
                />
            </View>

            {selected && (
                <Check size={19} color={C.primary} />
            )}
        </Pressable>
    );
}

function formatBirthDate(date) {
    if (!date) return "";

    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function toBirthISO(date) {
    if (!date) return "";

    const pad = n => String(n).padStart(2, "0");

    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join("-");
}

export default function NewGuests() {
    const router = useRouter();

    const [documentType, setDocumentType] = useState("DNI");
    const [documentNumber, setDocumentNumber] = useState("");
    const [validatedDni, setValidatedDni] = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [nationality, setNationality] = useState("Peruana");

    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [birthDate, setBirthDate] = useState(null);
    const [sex, setSex] = useState("");
    const [origin, setOrigin] = useState("");
    const [notes, setNotes] = useState("");

    const [sheet, setSheet] = useState(null);
    const [countrySearch, setCountrySearch] = useState("");
    const [customCountry, setCustomCountry] = useState("");

    const [consulting, setConsulting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateDraft, setDateDraft] = useState(new Date());

    const isDni = documentType === "DNI";

    const changeDocumentType = type => {
        setDocumentType(type);
        setDocumentNumber("");
        setValidatedDni("");
        setFirstName("");
        setLastName("");
        setNationality(type === "DNI" ? "Peruana" : "");
        setSheet(null);
    };

    const changeDocumentNumber = value => {
        setDocumentNumber(
            isDni
                ? value.replace(/\D/g, "").slice(0, 8)
                : value.trimStart()
        );

        setValidatedDni("");
        setFirstName("");
        setLastName("");
    };

    const handleConsultDni = async () => {
        if (consulting) return;

        if (!/^\d{8}$/.test(documentNumber)) {
            Alert.alert(
                "DNI inválido",
                "Ingresa los 8 dígitos."
            );
            return;
        }

        setConsulting(true);

        try {
            const person = await consultDni(documentNumber);

            setFirstName(person.firstName);
            setLastName(person.lastName);
            setValidatedDni(documentNumber);
            setNationality("Peruana");
        } catch (error) {
            Alert.alert(
                "Error de consulta",
                error?.message ||
                "No se pudo consultar el DNI."
            );
        } finally {
            setConsulting(false);
        }
    };

    const openBirthPicker = () => {
        setDateDraft(birthDate || new Date());
        setShowDatePicker(true);
    };

    const handleDateChange = (event, date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }

        if (event.type === "set" && date) {
            setDateDraft(date);

            if (Platform.OS === "android") {
                setBirthDate(date);
            }
        }
    };

    const handleSave = async () => {
        if (saving) return;

        if (isDni && validatedDni !== documentNumber) {
            Alert.alert(
                "DNI pendiente",
                "Consulta el DNI antes de guardar."
            );
            return;
        }

        setSaving(true);

        try {
            await registerGuest({
                documentType,
                documentNumber,
                firstName,
                lastName,
                nationality,
                phone,
                email,
                birthDate: toBirthISO(birthDate),
                sex,
                origin,
                notes,
            });

            Alert.alert(
                "Huésped registrado",
                "El huésped se guardó correctamente.",
                [{
                    text: "Aceptar",
                    onPress: () => router.back(),
                }]
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

    const filteredCountries = COUNTRIES.filter(country =>
        country.toLowerCase().includes(
            countrySearch.toLowerCase()
        )
    );

    return (
        <ScreenTab>
            <View style={styles.header}>
                <Button
                    icon={ChevronLeft}
                    iconOnly
                    variant="ghost"
                    onPress={() => router.back()}
                />

                <TextField
                    label="Nuevo huésped"
                    size="2xl"
                    weight="bold"
                />
            </View>

            <View style={styles.section}>
                <TextField
                    label="Identificación"
                    size="lg"
                    weight="semibold"
                />

                <SelectField
                    label="Tipo de documento *"
                    value={
                        DOCUMENTS.find(
                            item => item.value === documentType
                        )?.label
                    }
                    onPress={() => setSheet("documents")}
                />

                <View style={styles.field}>
                    <TextField
                        label="Número de documento *"
                        size="sm"
                        weight="semibold"
                    />

                    <View style={styles.documentRow}>
                        <TextInput
                            value={documentNumber}
                            onChangeText={changeDocumentNumber}
                            placeholder={
                                isDni
                                    ? "DNI de 8 dígitos"
                                    : "Número de documento"
                            }
                            placeholderTextColor="#a1a1aa"
                            keyboardType={
                                isDni
                                    ? "number-pad"
                                    : "default"
                            }
                            maxLength={isDni ? 8 : 30}
                            style={[
                                styles.input,
                                { flex: 1 },
                            ]}
                        />

                        {isDni && (
                            <Pressable
                                onPress={handleConsultDni}
                                disabled={consulting}
                                style={styles.consultButton}
                            >
                                {consulting ? (
                                    <ActivityIndicator
                                        color={C.white}
                                    />
                                ) : (
                                    <Search
                                        size={21}
                                        color={C.white}
                                    />
                                )}
                            </Pressable>
                        )}
                    </View>

                    {isDni &&
                        validatedDni === documentNumber &&
                        validatedDni !== "" && (
                            <TextField
                                label="DNI consultado correctamente"
                                size="xs"
                                style={{ color: "#15803d" }}
                            />
                        )}
                </View>

                <Field
                    label="Nombres *"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Nombres"
                    editable={!isDni}
                />

                <Field
                    label="Apellidos *"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Apellidos"
                    editable={!isDni}
                />

                {isDni ? (
                    <Field
                        label="Nacionalidad"
                        value="Peruana"
                        editable={false}
                    />
                ) : (
                    <SelectField
                        label="País de nacionalidad *"
                        value={nationality}
                        onPress={() => {
                            setCountrySearch("");
                            setSheet("countries");
                        }}
                    />
                )}

                <Field
                    label="Teléfono"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Número de contacto"
                    keyboardType="phone-pad"
                />

                <Field
                    label="Correo electrónico"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="correo@ejemplo.com"
                    keyboardType="email-address"
                />
            </View>

            <View style={styles.section}>
                <TextField
                    label="Información personal"
                    size="lg"
                    weight="semibold"
                />

                <SelectField
                    label="Fecha de nacimiento"
                    value={formatBirthDate(birthDate)}
                    onPress={openBirthPicker}
                />

                <SelectField
                    label="Sexo"
                    value={
                        SEX_OPTIONS.find(
                            item => item.value === sex
                        )?.label
                    }
                    onPress={() => setSheet("sex")}
                />

                <Field
                    label="Procedencia"
                    value={origin}
                    onChangeText={setOrigin}
                    placeholder="Ej. Huancayo, Junín"
                />

                <Field
                    label="Observaciones"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Información adicional..."
                    multiline
                />
            </View>

            <View style={styles.notice}>
                <Info size={18} color={C.gray} />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="Este registro no genera una reserva ni autoriza el ingreso. Las verificaciones legales correspondientes se realizarán durante el check-in."
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <Button
                text="Guardar huésped"
                loading={saving}
                disabled={saving || consulting}
                onPress={handleSave}
            />

            {showDatePicker && (
                <View style={styles.pickerContainer}>
                    <DateTimePicker
                        value={dateDraft}
                        mode="date"
                        display={
                            Platform.OS === "ios"
                                ? "spinner"
                                : "default"
                        }
                        maximumDate={new Date()}
                        onChange={handleDateChange}
                    />

                    {Platform.OS === "ios" && (
                        <Button
                            text="Confirmar fecha"
                            onPress={() => {
                                setBirthDate(dateDraft);
                                setShowDatePicker(false);
                            }}
                        />
                    )}
                </View>
            )}

            <BottomSheet
                visible={sheet === "documents"}
                title="Tipo de documento"
                onClose={() => setSheet(null)}
            >
                {DOCUMENTS.map(item => (
                    <Choice
                        key={item.value}
                        label={item.label}
                        selected={
                            documentType === item.value
                        }
                        onPress={() =>
                            changeDocumentType(item.value)
                        }
                    />
                ))}
            </BottomSheet>

            <BottomSheet
                visible={sheet === "sex"}
                title="Sexo"
                onClose={() => setSheet(null)}
            >
                {SEX_OPTIONS.map(item => (
                    <Choice
                        key={item.value}
                        label={item.label}
                        selected={sex === item.value}
                        onPress={() => {
                            setSex(item.value);
                            setSheet(null);
                        }}
                    />
                ))}
            </BottomSheet>

            <BottomSheet
                visible={sheet === "countries"}
                title="País de nacionalidad"
                onClose={() => setSheet(null)}
            >
                <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Buscar país..."
                    placeholderTextColor="#a1a1aa"
                    style={styles.input}
                />

                {filteredCountries.map(country => (
                    <Choice
                        key={country}
                        label={country}
                        selected={
                            nationality === country
                        }
                        onPress={() => {
                            setNationality(country);
                            setSheet(null);
                        }}
                    />
                ))}

                <Button
                    text="Escribir otro país"
                    variant="secondary"
                    onPress={() => {
                        setCustomCountry(countrySearch);
                        setSheet("custom-country");
                    }}
                />
            </BottomSheet>

            <BottomSheet
                visible={sheet === "custom-country"}
                title="Otro país"
                onClose={() => setSheet(null)}
            >
                <Field
                    label="País *"
                    value={customCountry}
                    onChangeText={setCustomCountry}
                    placeholder="Nombre del país"
                />

                <Button
                    text="Guardar país"
                    onPress={() => {
                        const value = customCountry.trim();

                        if (!value) {
                            Alert.alert(
                                "Atención",
                                "Ingresa el país."
                            );
                            return;
                        }

                        setNationality(value);
                        setSheet(null);
                    }}
                />
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
    section: {
        gap: 16,
    },
    field: {
        gap: 9,
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
        minHeight: 100,
        textAlignVertical: "top",
    },
    readOnly: {
        backgroundColor: C.light,
        color: C.gray,
    },
    selector: {
        minHeight: 52,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.white,
    },
    documentRow: {
        flexDirection: "row",
        gap: 10,
    },
    consultButton: {
        width: 52,
        height: 52,
        backgroundColor: C.primary,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    choice: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 54,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        backgroundColor: C.white,
    },
    pickerContainer: {
        gap: 10,
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