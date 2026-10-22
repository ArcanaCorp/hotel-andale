import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, BedDouble, CalendarDays, CheckCircle2, CreditCard, LogIn, LogOut, QrCode, XCircle, ChevronRight, Wallet, ReceiptText } from "lucide-react-native";

import ScreenTab from "../../components/ui/ScreenTab";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import { tokens } from "../../styles/tokens";
import { getDatabase } from "../../database";
import { registerPayment } from "../../database/repositories/payments.repository";
import { cancelBooking } from "../../database/repositories/bookings.repository";

const C = { primary: tokens.colors.primary, black: "#18181b", gray: "#71717a", border: "#e4e4e7", light: "#f4f4f5", white: "#ffffff", green: "#15803d", orange: "#c2410c", red: "#b91c1c" };
const METHODS = [
    { value: "CASH", label: "Efectivo" },
    { value: "YAPE", label: "Yape" },
    { value: "PLIN", label: "Plin" },
    { value: "TRANSFER", label: "Transferencia" },
    { value: "CARD", label: "Tarjeta" },
];
const STATUS = { PENDING: "Pendiente", CONFIRMED: "Confirmada", CHECKED_IN: "Check-in realizado", CANCELLED: "Cancelada", NO_SHOW: "No se presentó" };
const money = cents => `S/ ${(Number(cents || 0) / 100).toFixed(2)}`;
function dateLabel(value) {
    if (!value) return "—";
    const [date, time = ""] = String(value).split("T");
    const parts = date.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]} · ${time.slice(0, 5)}` : value;
}
function Info({ label, value }) {
    return <View style={styles.info}><TextField label={label} size="xs" color="gray"/><TextField label={String(value ?? "—")} size="sm" weight="semibold"/></View>;
}
function MenuAction({ title, subtitle, Icon, onPress, disabled = false, danger = false }) {
    return (
        <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.65 }, disabled && { opacity: 0.45 }]}>
            <View style={[styles.menuIcon, danger && styles.menuIconDanger]}><Icon size={19} color={danger ? C.red : C.black}/></View>
            <View style={{ flex: 1, gap: 3 }}>
                <TextField label={title} size="sm" weight="semibold" style={danger ? { color: C.red } : undefined}/>
                {!!subtitle && <TextField label={subtitle} size="xs" color="gray"/>}
            </View>
            <ChevronRight size={18} color={C.gray}/>
        </Pressable>
    );
}
function Section({ title, children }) {
    return <View style={styles.card}><TextField label={title} size="md" weight="bold"/><View style={styles.sectionBody}>{children}</View></View>;
}

async function loadBookingDetails(id) {
    const db = await getDatabase();
    const booking = await db.getFirstAsync(`
        SELECT b.*, g.first_name, g.last_name, g.document_type, g.document_number,
               g.phone, g.nationality, r.number AS room_number, rt.name AS room_type
        FROM reservations b
        JOIN guests g ON g.id = b.guest_id
        JOIN rooms r ON r.id = b.room_id
        JOIN room_types rt ON rt.id = r.room_type_id
        WHERE b.id = ? LIMIT 1
    `, [id]);
    if (!booking) throw new Error("No se encontró la reserva.");
    const [payments, stay, charges] = await Promise.all([
        db.getAllAsync(`SELECT id, amount_cents, method, type, reference, notes, created_at,
                              reservation_id, stay_id
                       FROM payments WHERE reservation_id = ? OR stay_id IN
                       (SELECT id FROM stays WHERE reservation_id = ?)
                       ORDER BY created_at DESC, id DESC`, [id, id]),
        db.getFirstAsync(`SELECT id, status, check_in_at, scheduled_check_out_at, actual_check_out_at
                          FROM stays WHERE reservation_id = ? ORDER BY id DESC LIMIT 1`, [id]),
        db.getFirstAsync(`SELECT COALESCE(SUM(c.total_cents),0) AS total_cents
                          FROM charges c JOIN stays s ON s.id = c.stay_id
                          WHERE s.reservation_id = ?`, [id]),
    ]);
    const paidCents = payments.reduce((sum, p) => sum + (p.type === "REFUND" ? -p.amount_cents : p.amount_cents), 0);
    const totalCents = booking.agreed_price_cents + Number(charges?.total_cents || 0);
    return { booking, payments, stay, totalCents, paidCents, balanceCents: totalCents - paidCents };
}

export default function BookingDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const id = Number(rawId);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("CASH");
    const [reference, setReference] = useState("");

    const refresh = useCallback(async () => {
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador de reserva inválido.");
        const result = await loadBookingDetails(id);
        setData(result);
    }, [id]);

    useFocusEffect(useCallback(() => {
        let active = true;
        setLoading(true);
        setError("");
        loadBookingDetails(id).then(result => { if (active) setData(result); })
            .catch(err => { if (active) setError(err?.message || "No se pudo cargar la reserva."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id]));

    const run = async (fn, successMessage) => {
        if (busy) return;
        setBusy(true);
        try {
            await fn();
            await refresh();
            if (successMessage) Alert.alert("Listo", successMessage);
        } catch (err) {
            Alert.alert("No se pudo completar", err?.message || "Ocurrió un error.");
        } finally { setBusy(false); }
    };

    const confirmReservation = () => Alert.alert("Confirmar reserva", "¿Confirmas esta reserva?", [
        { text: "Volver", style: "cancel" },
        { text: "Confirmar", onPress: () => run(async () => {
            const db = await getDatabase();
            await db.withExclusiveTransactionAsync(async tx => {
                const result = await tx.runAsync("UPDATE reservations SET status = 'CONFIRMED' WHERE id = ? AND status = 'PENDING'", [id]);
                if (result.changes !== 1) throw new Error("La reserva ya no está pendiente.");
            });
        }, "La reserva fue confirmada.") },
    ]);

    const cancelReservation = () => Alert.alert("Cancelar reserva", "La reserva dejará de bloquear la habitación. Los pagos recibidos no se devuelven automáticamente; revisa los importes antes de cancelar.", [
        { text: "Volver", style: "cancel" },
        { text: "Cancelar reserva", style: "destructive", onPress: () => run(() => cancelBooking(id), "Reserva cancelada. Revisa si corresponde una devolución.") },
    ]);

    const savePayment = () => {
        const raw = amount.trim().replace(",", ".");
        if (!/^\d+(\.\d{1,2})?$/.test(raw)) return Alert.alert("Importe inválido", "Ingresa un monto válido con hasta dos decimales.");
        const amountCents = Math.round(Number(raw) * 100);
        if (amountCents <= 0 || amountCents > data.balanceCents) return Alert.alert("Importe inválido", "El cobro debe ser mayor a cero y no superar el saldo pendiente.");
        if (method !== "CASH" && !reference.trim()) return Alert.alert("Referencia requerida", "Ingresa el número de operación o referencia del pago.");
        Alert.alert("Registrar cobro", `¿Registrar ${money(amountCents)} mediante ${METHODS.find(m => m.value === method)?.label}?`, [
            { text: "Volver", style: "cancel" },
            { text: "Registrar", onPress: () => run(async () => {
                await registerPayment({ reservationId: id, amountCents, paymentMethod: method, reference: reference.trim() });
                setPaymentOpen(false);
                setAmount("");
                setReference("");
            }, "Cobro registrado correctamente.") },
        ]);
    };

    if (loading) return <ScreenTab><ActivityIndicator size="large" color={C.primary}/><TextField label="Cargando reserva..." size="sm" color="gray"/></ScreenTab>;
    if (error || !data) return <ScreenTab><TextField label="No se pudo cargar la reserva" size="lg" weight="bold"/><TextField label={error || "Sin datos."} size="sm" color="gray"/><Button text="Volver a reservas" onPress={() => router.replace("/(tabs)/bookings")}/></ScreenTab>;

    const { booking: b, stay, payments, totalCents, paidCents, balanceCents } = data;
    const canManage = ["PENDING", "CONFIRMED"].includes(b.status);
    const canCheckIn = canManage && !stay;
    const canCheckOut = stay?.status === "ACTIVE";
    const paymentStatus = balanceCents <= 0 ? "Pagado" : paidCents > 0 ? "Pago parcial" : "Sin pago";
    const durationHours = Math.max(0, Math.round((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 3600000));

    return <ScreenTab>
        <View style={styles.header}>
            <Button icon={ArrowLeft} iconOnly variant="ghost" onPress={() => router.replace("/(tabs)/bookings")}/>
            <View style={{ flex: 1 }}><TextField label="Detalle de reserva" size="xl" weight="bold"/><TextField label={b.booking_code || `Reserva #${b.id}`} size="xs" color="gray"/></View>
        </View>
        <View style={styles.badge}><TextField label={STATUS[b.status] || b.status} size="xs" weight="semibold"/></View>
        <Section title="Huésped">
            <Info label="Nombre completo" value={`${b.first_name} ${b.last_name}`}/>
            <View style={styles.columns}><Info label="Documento" value={[b.document_type, b.document_number].filter(Boolean).join(" · ") || "—"}/><Info label="Teléfono" value={b.phone || "—"}/></View>
            <Info label="Nacionalidad" value={b.nationality || "—"}/>
        </Section>
        <Section title="Habitación y estadía">
            <Info label="Habitación" value={`${b.room_number} · ${b.room_type}`}/>
            <View style={styles.columns}><Info label="Ingreso previsto" value={dateLabel(b.start_at)}/><Info label="Salida prevista" value={dateLabel(b.end_at)}/></View>
            <Info label="Modalidad" value={b.billing_mode === "HOURLY" ? "Por horas" : "Por noches"}/>
            <Info label="Canal de reserva" value={({DIRECT:"Directa",WHATSAPP:"WhatsApp",PHONE:"Teléfono",WALK_IN:"Presencial",WEB:"Web",OTHER:"Otro"})[b.booking_origin] || "Directa"}/>
            <Info label="Duración programada" value={`${durationHours} hora${durationHours === 1 ? "" : "s"}`}/>
            {stay && <><Info label="Estado de estadía" value={stay.status === "ACTIVE" ? "En curso" : stay.status === "COMPLETED" ? "Finalizada" : "Cancelada"}/><Info label="Check-in registrado" value={dateLabel(stay.check_in_at)}/>{stay.actual_check_out_at && <Info label="Check-out registrado" value={dateLabel(stay.actual_check_out_at)}/>}</>}
            {b.notes ? <Info label="Observaciones" value={b.notes}/> : null}
        </Section>
        <Section title="Estado de pago">
            <View style={styles.paymentBadge}><TextField label={paymentStatus} size="sm" weight="semibold"/></View>
            <View style={styles.moneyRow}><TextField label="Importe acordado" size="sm" color="gray"/><TextField label={money(b.agreed_price_cents)} size="sm" weight="semibold"/></View>
            {totalCents !== b.agreed_price_cents && <View style={styles.moneyRow}><TextField label="Cargos adicionales" size="sm" color="gray"/><TextField label={money(totalCents - b.agreed_price_cents)} size="sm"/></View>}
            <View style={styles.moneyRow}><TextField label="Total" size="sm" color="gray"/><TextField label={money(totalCents)} size="sm" weight="semibold"/></View>
            <View style={styles.moneyRow}><TextField label="Abonado neto" size="sm" color="gray"/><TextField label={money(paidCents)} size="sm" weight="semibold"/></View>
            <View style={styles.balance}><TextField label={balanceCents >= 0 ? "Saldo pendiente" : "Saldo a favor"} size="xs" color="gray"/><TextField label={money(Math.abs(balanceCents))} size="2xl" weight="bold"/></View>
            {payments.length > 0 ? payments.map(p => <View key={p.id} style={styles.paymentLine}><View style={{ flex: 1 }}><TextField label={`${p.type === "REFUND" ? "Devolución" : "Cobro"} · ${METHODS.find(m => m.value === p.method)?.label || p.method}`} size="sm" weight="medium"/><TextField label={`${dateLabel(p.created_at)}${p.reference ? ` · Ref. ${p.reference}` : ""}`} size="xs" color="gray"/></View><TextField label={`${p.type === "REFUND" ? "−" : "+"}${money(p.amount_cents)}`} size="sm" weight="semibold"/></View>) : <TextField label="Todavía no hay pagos registrados." size="xs" color="gray"/>}
        </Section>
        <Section title="Acciones">
            {balanceCents > 0 && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.status) && (
                <MenuAction title="Registrar pago" subtitle="Abono o pago total de la reserva" Icon={Wallet} disabled={busy} onPress={() => { setAmount((Math.max(balanceCents, 0) / 100).toFixed(2)); setMethod("CASH"); setReference(""); setPaymentOpen(true); }}/>
            )}

            {b.status === "PENDING" && <MenuAction title="Confirmar reserva" subtitle="Cambiar el estado a confirmada" Icon={CheckCircle2} disabled={busy} onPress={confirmReservation}/>}
            {canCheckIn && <MenuAction title="Realizar check-in" subtitle="Registrar el ingreso del huésped" Icon={LogIn} disabled={busy} onPress={() => router.push({ pathname: "/stays/check-in-details", params: { reservationId: String(id) } })}/>}
            {canCheckOut && <MenuAction title="Realizar check-out" subtitle="Revisar saldo y finalizar estadía" Icon={LogOut} disabled={busy} onPress={() => router.push({ pathname: "/stays/check-out", params: { stayId: String(stay.id) } })}/>}
            <MenuAction title="Ver y compartir entrada" subtitle="Abrir comprobante con código QR" Icon={QrCode} onPress={() => router.push({ pathname: "/booking/confirmation", params: { id: String(id) } })}/>
            {canManage && <MenuAction title="Cancelar reserva" subtitle="La reserva permanecerá en el historial" Icon={XCircle} danger disabled={busy} onPress={cancelReservation}/>}
        </Section>
        <BottomSheet visible={paymentOpen} title="Registrar pago" busy={busy} onClose={() => setPaymentOpen(false)}>
            <View style={styles.sheetSummary}>
                <TextField label="Saldo pendiente" size="xs" color="gray"/>
                <TextField label={money(balanceCents)} size="2xl" weight="bold"/>
            </View>
            <TextField label="Importe a cobrar (S/)" size="sm" weight="medium"/>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" value={amount} onChangeText={setAmount}/>
            <TextField label="Método de pago" size="sm" weight="medium"/>
            <View style={styles.methodList}>
                {METHODS.map(m => (
                    <Pressable key={m.value} onPress={() => setMethod(m.value)} style={[styles.method, method === m.value && styles.methodActive]}>
                        <TextField label={m.label} size="sm" weight={method === m.value ? "semibold" : "medium"}/>
                    </Pressable>
                ))}
            </View>
            {method !== "CASH" && <>
                <TextField label="Referencia / número de operación" size="sm" weight="medium"/>
                <TextInput style={styles.input} value={reference} onChangeText={setReference} placeholder="Número de operación"/>
            </>}
            <TextField label="Para registrar cobros debe existir una caja abierta." size="xs" color="gray"/>
            <Button text="Registrar cobro" variant="secondary" disabled={busy} loading={busy} onPress={savePayment} fullWidth/>
        </BottomSheet>
    </ScreenTab>;
}

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: 8 },
    card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, gap: 14 },
    sectionBody: { gap: 12 },
    info: { flex: 1, gap: 3 },
    columns: { flexDirection: "row", gap: 14 },
    badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30, backgroundColor: C.light },
    paymentBadge: { alignSelf: "flex-start", backgroundColor: C.light, padding: 8, borderRadius: 8 },
    moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    balance: { backgroundColor: C.light, padding: 16, borderRadius: 12, gap: 5 },
    paymentLine: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
    sheetSummary: { padding: 16, backgroundColor: C.light, borderRadius: 14, gap: 5 },
    menuAction: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    menuIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.light, alignItems: "center", justifyContent: "center" },
    menuIconDanger: { backgroundColor: "#fef2f2" },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: C.black, fontSize: 15 },
    methodList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    method: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.light, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    methodActive: { borderColor: C.black, backgroundColor: "#e4e4e7" },
});