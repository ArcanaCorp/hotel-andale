import { getDatabase } from "../index";

export async function findGuestByDocument(documentType, documentNumber) {
    const db = await getDatabase();

    return db.getFirstAsync(
        `SELECT *
         FROM guests
         WHERE document_type = ?
           AND document_number = ?
         LIMIT 1`,
        [documentType, documentNumber]
    );
}

export async function getGuestDetail(id) {
    const db = await getDatabase();

    return db.getFirstAsync(
        `
        SELECT
            g.*,

            (
                SELECT COUNT(*)
                FROM reservations r
                WHERE r.guest_id = g.id
            ) AS total_reservations,

            (
                SELECT COUNT(*)
                FROM reservations r
                WHERE r.guest_id = g.id
                  AND r.status IN ('PENDING', 'CONFIRMED')
            ) AS active_reservations,

            (
                SELECT COUNT(*)
                FROM reservations r
                WHERE r.guest_id = g.id
                  AND r.status = 'CANCELLED'
            ) AS cancelled_reservations,

            (
                SELECT COUNT(*)
                FROM stays s
                WHERE s.status = 'COMPLETED'
                  AND (
                      s.primary_guest_id = g.id
                      OR EXISTS (
                          SELECT 1
                          FROM stay_guests sg
                          WHERE sg.stay_id = s.id
                            AND sg.guest_id = g.id
                      )
                  )
            ) AS completed_stays,

            (
                SELECT COUNT(*)
                FROM stays s
                WHERE s.status = 'ACTIVE'
                  AND (
                      s.primary_guest_id = g.id
                      OR EXISTS (
                          SELECT 1
                          FROM stay_guests sg
                          WHERE sg.stay_id = s.id
                            AND sg.guest_id = g.id
                      )
                  )
            ) AS current_stays,

            (
                SELECT MAX(s.check_in_at)
                FROM stays s
                WHERE s.status IN ('ACTIVE', 'COMPLETED')
                  AND (
                      s.primary_guest_id = g.id
                      OR EXISTS (
                          SELECT 1
                          FROM stay_guests sg
                          WHERE sg.stay_id = s.id
                            AND sg.guest_id = g.id
                      )
                  )
            ) AS last_visit

        FROM guests g
        WHERE g.id = ?
        LIMIT 1
        `,
        [id]
    );
}

export async function updateGuest(id, data) {
    const db = await getDatabase();

    let transactionResult = null;
    await db.withExclusiveTransactionAsync(async tx => {
        const guest = await tx.getFirstAsync(
            "SELECT id FROM guests WHERE id = ?",
            [id]
        );

        if (!guest) {
            throw new Error("El huésped no existe.");
        }

        const firstName = String(data.firstName || "").trim();
        const lastName = String(data.lastName || "").trim();
        const documentType = String(data.documentType || "").trim();
        const documentNumber = String(data.documentNumber || "").trim();

        if (!firstName || !lastName) {
            throw new Error(
                "Los nombres y apellidos son obligatorios."
            );
        }

        if (!documentType || !documentNumber) {
            throw new Error(
                "El documento de identidad es obligatorio."
            );
        }

        if (
            documentType === "DNI" &&
            !/^\d{8}$/.test(documentNumber)
        ) {
            throw new Error(
                "El DNI debe contener 8 dígitos."
            );
        }

        const duplicate = await tx.getFirstAsync(
            `
            SELECT id
            FROM guests
            WHERE document_type = ?
              AND document_number = ?
              AND id <> ?
            LIMIT 1
            `,
            [documentType, documentNumber, id]
        );

        if (duplicate) {
            throw new Error(
                "Ya existe otro huésped con este documento."
            );
        }

        await tx.runAsync(
            `
            UPDATE guests
            SET
                first_name = ?,
                last_name = ?,
                document_type = ?,
                document_number = ?,
                nationality = ?,
                phone = ?,
                email = ?,
                birth_date = ?,
                sex = ?,
                origin = ?,
                notes = ?
            WHERE id = ?
            `,
            [
                firstName,
                lastName,
                documentType,
                documentNumber,
                data.nationality?.trim() || null,
                data.phone?.trim() || null,
                data.email?.trim() || null,
                data.birthDate || null,
                data.sex || null,
                data.origin?.trim() || null,
                data.notes?.trim() || null,
                id,
            ]
        );

        transactionResult = true;
    });
    return transactionResult;
}
