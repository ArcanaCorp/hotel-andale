
import { getDatabase } from "../index";

const now = () => new Date().toISOString();

export async function getOpenCashSession() {
    const db = await getDatabase();

    return db.getFirstAsync(`
        SELECT *
        FROM cash_sessions
        WHERE status = 'OPEN'
        LIMIT 1
    `);
}

export async function openCashSession({
    openingAmountCents,
    notes,
}) {
    const db = await getDatabase();

    let createdId = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const existing = await tx.getFirstAsync(`
            SELECT id
            FROM cash_sessions
            WHERE status = 'OPEN'
            LIMIT 1
        `);

        if (existing) {
            throw new Error(
                "Ya existe una caja abierta."
            );
        }

        if (
            !Number.isSafeInteger(openingAmountCents) ||
            openingAmountCents < 0
        ) {
            throw new Error("Monto inicial inválido.");
        }

        const result = await tx.runAsync(
            `
            INSERT INTO cash_sessions (
                opened_at,
                opening_amount_cents,
                status,
                opening_notes
            )
            VALUES (?, ?, 'OPEN', ?)
            `,
            [
                now(),
                openingAmountCents,
                notes?.trim() || null,
            ]
        );

        createdId = result.lastInsertRowId;
    });

    return createdId;
}

export async function registerCashMovement(data) {
    const db = await getDatabase();

    let createdId = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const session = await tx.getFirstAsync(`
            SELECT id
            FROM cash_sessions
            WHERE status = 'OPEN'
            LIMIT 1
        `);

        if (!session) {
            throw new Error(
                "Debes abrir una caja antes de registrar movimientos."
            );
        }

        if (!["INCOME", "EXPENSE"].includes(data.type)) {
            throw new Error("Tipo de movimiento inválido.");
        }

        if (
            !["CASH", "YAPE", "PLIN", "TRANSFER", "CARD"]
                .includes(data.paymentMethod)
        ) {
            throw new Error("Método de pago inválido.");
        }

        if (
            !Number.isSafeInteger(data.amountCents) ||
            data.amountCents <= 0
        ) {
            throw new Error("El monto debe ser mayor a cero.");
        }

        if (!data.category?.trim()) {
            throw new Error(
                "Selecciona una categoría."
            );
        }

        const result = await tx.runAsync(
            `
            INSERT INTO cash_movements (
                session_id,
                type,
                category,
                description,
                amount_cents,
                payment_method,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                session.id,
                data.type,
                data.category.trim(),
                data.description?.trim() || null,
                data.amountCents,
                data.paymentMethod,
                now(),
            ]
        );

        createdId = result.lastInsertRowId;
    });

    return createdId;
}

export async function getCashSummary() {
    const db = await getDatabase();

    const session = await getOpenCashSession();

    if (!session) return null;

    const totals = await db.getFirstAsync(
        `
        SELECT
            COALESCE(SUM(
                CASE WHEN type = 'INCOME'
                THEN amount_cents ELSE 0 END
            ), 0) AS income_cents,

            COALESCE(SUM(
                CASE WHEN type = 'EXPENSE'
                THEN amount_cents ELSE 0 END
            ), 0) AS expense_cents,

            COALESCE(SUM(
                CASE
                    WHEN payment_method = 'CASH'
                     AND type = 'INCOME'
                    THEN amount_cents

                    WHEN payment_method = 'CASH'
                     AND type = 'EXPENSE'
                    THEN -amount_cents

                    ELSE 0
                END
            ), 0) AS cash_net_cents

        FROM cash_movements
        WHERE session_id = ?
        `,
        [session.id]
    );

    return {
        ...session,
        income_cents: totals.income_cents,
        expense_cents: totals.expense_cents,
        expected_cash_cents:
            session.opening_amount_cents +
            totals.cash_net_cents,
    };
}

export async function listCashMovements(sessionId) {
    const db = await getDatabase();

    return db.getAllAsync(
        `
        SELECT *
        FROM cash_movements
        WHERE session_id = ?
        ORDER BY created_at DESC, id DESC
        `,
        [sessionId]
    );
}

export async function closeCashSession({
    closingAmountCents,
    notes,
}) {
    const db = await getDatabase();

    let closingResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const session = await tx.getFirstAsync(`
            SELECT *
            FROM cash_sessions
            WHERE status = 'OPEN'
            LIMIT 1
        `);

        if (!session) {
            throw new Error(
                "No existe una caja abierta."
            );
        }

        if (
            !Number.isSafeInteger(closingAmountCents) ||
            closingAmountCents < 0
        ) {
            throw new Error(
                "El monto de cierre no es válido."
            );
        }

        const totals = await tx.getFirstAsync(
            `
            SELECT COALESCE(SUM(
                CASE
                    WHEN payment_method = 'CASH'
                     AND type = 'INCOME'
                    THEN amount_cents

                    WHEN payment_method = 'CASH'
                     AND type = 'EXPENSE'
                    THEN -amount_cents

                    ELSE 0
                END
            ), 0) AS net_cash
            FROM cash_movements
            WHERE session_id = ?
            `,
            [session.id]
        );

        const expected =
            session.opening_amount_cents +
            totals.net_cash;

        const difference =
            closingAmountCents - expected;

        await tx.runAsync(
            `
            UPDATE cash_sessions
            SET
                closed_at = ?,
                closing_amount_cents = ?,
                expected_amount_cents = ?,
                difference_cents = ?,
                closing_notes = ?,
                status = 'CLOSED'
            WHERE id = ?
              AND status = 'OPEN'
            `,
            [
                now(),
                closingAmountCents,
                expected,
                difference,
                notes?.trim() || null,
                session.id,
            ]
        );

        closingResult = { expected, counted: closingAmountCents, difference };
    });

    return closingResult;
}