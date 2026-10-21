
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
    Check,
    Search,
    CalendarDays,
    Info,
} from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import BottomSheet from "../../components/ui/BottomSheet";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";

import { consultDni } from "../../services/dni.service";

import {
    listAvailableBookingRooms,
    registerBooking,
} from "../../services/bookings.service";

import { tokens } from "../../styles/tokens";
import { lookupGuest } from "../../services/guestLookup.service";

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

const pad = n => String(n).padStart(2, "0");

function toLocalISO(date) {
    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
    );
}

function formatDate(date) {
    if (!date) return "Seleccionar fecha y hora";

    return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    multiline = false,
    editable = true,
    maxLength,
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
                editable={editable}
                maxLength={maxLength}
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

function Choice({
    label,
    subtitle,
    selected,
    onPress,
}) {
    return (
        <Pressable
            style={styles.choice}
            onPress={onPress}
        >
            <View style={{ flex: 1, gap: 4 }}>
                <TextField
                    label={label}
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

export default function NewBooking() {
    const router = useRouter();

    // Identificación
    const [documentType, setDocumentType] = useState("DNI");
    const [documentNumber, setDocumentNumber] = useState("");
    const [validatedDni, setValidatedDni] = useState("");
    const [consulting, setConsulting] = useState(false);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [nationality, setNationality] = useState("Peruana");
    const [customCountry, setCustomCountry] = useState("");
    const [phone, setPhone] = useState("");

    // Estadía
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [origin, setOrigin] = useState("");

    // Picker nativo
    const [pickerTarget, setPickerTarget] = useState(null);
    const [pickerMode, setPickerMode] = useState("date");
    const [pickerDraft, setPickerDraft] = useState(new Date());

    // Habitación y precio
    const [rooms, setRooms] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [billingMode, setBillingMode] = useState("NIGHTLY");
    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");

    // Modales y estados
    const [sheet, setSheet] = useState(null);
    const [countrySearch, setCountrySearch] = useState("");
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [saving, setSaving] = useState(false);

    const isDni = documentType === "DNI";
    const needsCountry = !isDni;

    const clearRoom = () => {
        setRoomId(null);
        setSelectedRoom(null);
        setRooms([]);
        setPrice("");
    };

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
        setDocumentNumber(documentType === "DNI" ? value.replace(/\D/g, "").slice(0, 8) : value.trimStart());
        setValidatedDni("");
        setFirstName("");
        setLastName("");
        setPhone("");
    };

    
    const handleConsultDocument = async () => {
        if (consulting) return;

        const number = documentNumber.trim();

        if (!number) {
            Alert.alert(
                "Documento requerido",
                "Ingresa el número de documento."
            );
            return;
        }

        setConsulting(true);

        try {
            const result = await lookupGuest(
                documentType,
                number
            );

            setFirstName(result.firstName);
            setLastName(result.lastName);
            setNationality(result.nationality);
            setPhone(result.phone);

            if (documentType === "DNI") {
                setValidatedDni(number);
            }

            if (result.source === "LOCAL") {
                Alert.alert(
                    "Huésped encontrado",
                    "Se recuperaron sus datos del registro local."
                );
            } else if (result.source === "NEW") {
                Alert.alert(
                    "Huésped nuevo",
                    "No existe un registro local. Completa sus datos manualmente."
                );
            }
        } catch (error) {
            setValidatedDni("");

            Alert.alert(
                "No se pudo consultar",
                error?.message ||
                    "Ocurrió un error buscando al huésped."
            );
        } finally {
            setConsulting(false);
        }
    };

    const openPicker = target => {
        const current =
            target === "start" ? startDate : endDate;

        const date = current
            ? new Date(current)
            : new Date();

        setPickerTarget(target);
        setPickerDraft(date);
        setPickerMode(
            Platform.OS === "ios" ? "datetime" : "date"
        );
    };

    const savePickedDate = (target, date) => {
        if (target === "start") {
            setStartDate(date);
        } else {
            setEndDate(date);
        }

        clearRoom();
    };

    const handlePickerChange = (event, selectedDate) => {
        if (event.type === "dismissed") {
            setPickerTarget(null);
            return;
        }

        if (!selectedDate) return;

        if (Platform.OS === "ios") {
            setPickerDraft(selectedDate);
            return;
        }

        if (pickerMode === "date") {
            const combined = new Date(pickerDraft);

            combined.setFullYear(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
            );

            setPickerDraft(combined);
            setPickerMode("time");
            return;
        }

        const combined = new Date(pickerDraft);

        combined.setHours(
            selectedDate.getHours(),
            selectedDate.getMinutes(),
            0,
            0
        );

        savePickedDate(pickerTarget, combined);
        setPickerTarget(null);
    };

    const loadRooms = async () => {
        if (!startDate || !endDate) {
            Alert.alert(
                "Fechas requeridas",
                "Selecciona ingreso y salida primero."
            );
            return;
        }

        if (startDate >= endDate) {
            Alert.alert(
                "Fechas incorrectas",
                "La salida debe ser posterior al ingreso."
            );
            return;
        }

        setLoadingRooms(true);

        try {
            const result = await listAvailableBookingRooms(
                toLocalISO(startDate),
                toLocalISO(endDate)
            );

            setRooms(result);
            setSheet("rooms");
        } catch (error) {
            Alert.alert(
                "Error",
                error?.message || "No se pudo consultar."
            );
        } finally {
            setLoadingRooms(false);
        }
    };

    const selectRoom = room => {
        setRoomId(room.id);
        setSelectedRoom(room);

        const cents =
            billingMode === "HOURLY"
                ? room.hourly_price_cents
                : room.nightly_price_cents;

        setPrice(
            cents == null
                ? ""
                : (cents / 100).toFixed(2)
        );

        setSheet(null);
    };

    const changeMode = mode => {
        setBillingMode(mode);

        if (!selectedRoom) return;

        const cents =
            mode === "HOURLY"
                ? selectedRoom.hourly_price_cents
                : selectedRoom.nightly_price_cents;

        setPrice(
            cents == null
                ? ""
                : (cents / 100).toFixed(2)
        );
    };

    const handleSave = async () => {
        if (saving) return;

        if (isDni && validatedDni !== documentNumber) {
            Alert.alert(
                "Validación pendiente",
                "Consulta el DNI antes de registrar la reserva."
            );
            return;
        }

        if (needsCountry && !nationality.trim()) {
            Alert.alert(
                "Nacionalidad",
                "Selecciona o escribe el país."
            );
            return;
        }

        if (!startDate || !endDate) {
            Alert.alert(
                "Estadía",
                "Selecciona las fechas de ingreso y salida."
            );
            return;
        }

        setSaving(true);

        try {
            const bookingId = await registerBooking({
                documentType,
                documentNumber,
                firstName,
                lastName,
                nationality,
                phone,
                roomId,
                billingMode,
                startAt: toLocalISO(startDate),
                endAt: toLocalISO(endDate),
                price,
                notes,
            });

            router.replace({ pathname: "/booking/confirmation", params: { id: String(bookingId) }});
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
                    label="Nueva reserva"
                    size="2xl"
                    weight="bold"
                />
            </View>

            {/* IDENTIFICACIÓN */}
            <View style={styles.section}>
                <TextField
                    label="Identificación del titular"
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
                                    ? "Ingresa 8 dígitos"
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
                                style={[
                                    styles.consultButton,
                                    consulting && { opacity: 0.6 },
                                ]}
                                disabled={consulting}
                                onPress={handleConsultDocument}
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
                    placeholder="Nombres del titular"
                    editable={!isDni}
                />

                <Field
                    label="Apellidos *"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Apellidos del titular"
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
                        placeholder="Seleccionar país"
                        onPress={() => {
                            setCountrySearch("");
                            setSheet("countries");
                        }}
                    />
                )}

                <Field
                    label="Teléfono de contacto"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Ej. 987654321"
                    keyboardType="phone-pad"
                />
            </View>

            {/* ESTADÍA */}
            <View style={styles.section}>
                <TextField
                    label="Estadía"
                    size="lg"
                    weight="semibold"
                />

                <SelectField
                    label="Fecha y hora de ingreso *"
                    value={startDate ? formatDate(startDate) : ""}
                    placeholder="Seleccionar ingreso"
                    onPress={() => openPicker("start")}
                />

                <SelectField
                    label="Fecha y hora de salida *"
                    value={endDate ? formatDate(endDate) : ""}
                    placeholder="Seleccionar salida"
                    onPress={() => openPicker("end")}
                />

                <Field
                    label="Procedencia (opcional)"
                    value={origin}
                    onChangeText={setOrigin}
                    placeholder="Ej. Huancayo, Junín"
                />

                <SelectField
                    label="Habitación *"
                    value={
                        selectedRoom
                            ? `Hab. ${selectedRoom.number} · ${selectedRoom.room_type}`
                            : ""
                    }
                    placeholder="Consultar habitaciones disponibles"
                    onPress={loadRooms}
                />

                {loadingRooms && (
                    <ActivityIndicator color={C.primary} />
                )}
            </View>

            {/* TARIFA */}
            <View style={styles.section}>
                <TextField
                    label="Tarifa"
                    size="lg"
                    weight="semibold"
                />

                <View style={styles.modeRow}>
                    {[
                        { key: "HOURLY", label: "Por hora" },
                        { key: "NIGHTLY", label: "Por noche" },
                    ].map(item => {
                        const selected =
                            billingMode === item.key;

                        return (
                            <Pressable
                                key={item.key}
                                onPress={() => changeMode(item.key)}
                                style={[
                                    styles.mode,
                                    selected && styles.modeActive,
                                ]}
                            >
                                <TextField
                                    label={item.label}
                                    size="sm"
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

                <Field
                    label="Precio total acordado (S/) *"
                    value={price}
                    onChangeText={setPrice}
                    placeholder="Ej. 120.00"
                    keyboardType="decimal-pad"
                />
            </View>

            <Field
                label="Observaciones"
                value={notes}
                onChangeText={setNotes}
                placeholder="Solicitudes especiales..."
                multiline
            />

            <View style={styles.notice}>
                <Info size={18} color={C.gray} />

                <View style={{ flex: 1 }}>
                    <TextField
                        label="La reserva no reemplaza el registro legal de huéspedes. El check-in deberá completar las verificaciones correspondientes."
                        size="xs"
                        color="gray"
                    />
                </View>
            </View>

            <Button
                text="Registrar reserva"
                loading={saving}
                disabled={saving || consulting}
                onPress={handleSave}
            />

            {/* PICKER NATIVO */}
            {pickerTarget !== null && (
                <View>
                    <DateTimePicker
                        value={pickerDraft}
                        mode={pickerMode}
                        display={
                            Platform.OS === "ios"
                                ? "spinner"
                                : "default"
                        }
                        is24Hour
                        onChange={handlePickerChange}
                    />

                    {Platform.OS === "ios" && (
                        <Button
                            text="Confirmar fecha y hora"
                            onPress={() => {
                                savePickedDate(
                                    pickerTarget,
                                    pickerDraft
                                );
                                setPickerTarget(null);
                            }}
                        />
                    )}
                </View>
            )}

            {/* DOCUMENTOS */}
            <BottomSheet
                visible={sheet === "documents"}
                title="Tipo de documento"
                onClose={() => setSheet(null)}
            >
                {DOCUMENTS.map(item => (
                    <Choice
                        key={item.value}
                        label={item.label}
                        selected={documentType === item.value}
                        onPress={() =>
                            changeDocumentType(item.value)
                        }
                    />
                ))}
            </BottomSheet>

            {/* PAÍSES */}
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

            {/* PAÍS PERSONALIZADO */}
            <BottomSheet
                visible={sheet === "custom-country"}
                title="Otro país"
                onClose={() => setSheet(null)}
            >
                <Field
                    label="País de nacionalidad *"
                    value={customCountry}
                    onChangeText={setCustomCountry}
                    placeholder="Escribe el país"
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

            {/* HABITACIONES */}
            <BottomSheet
                visible={sheet === "rooms"}
                title="Habitaciones disponibles"
                onClose={() => setSheet(null)}
            >
                {rooms.length === 0 ? (
                    <TextField
                        label="No hay habitaciones disponibles para estas fechas."
                        size="sm"
                        color="gray"
                    />
                ) : (
                    rooms.map(room => (
                        <Choice
                            key={room.id}
                            label={`Habitación ${room.number}`}
                            subtitle={
                                `${room.room_type} · ` +
                                `${room.capacity} personas`
                            }
                            selected={roomId === room.id}
                            onPress={() => selectRoom(room)}
                        />
                    ))
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
        backgroundColor: C.white,
        paddingHorizontal: 14,
        paddingVertical: 12,
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
    modeRow: {
        flexDirection: "row",
        gap: 10,
    },
    mode: {
        flex: 1,
        minHeight: 48,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    modeActive: {
        backgroundColor: C.primary,
        borderColor: C.primary,
    },
    choice: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 54,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: C.white,
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