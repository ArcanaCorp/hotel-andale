import { getDatabase } from "../database";
import { findGuestByDocument } from "../database/repositories/guests.repository";

export async function listGuests() {
    const db = await getDatabase();

    return db.getAllAsync(`
        SELECT
            g.id,
            g.first_name,
            g.last_name,
            g.document_type,
            g.document_number,
            g.phone,
            g.nationality,
            g.notes,
            g.created_at,

            COALESCE((
                SELECT COUNT(*)
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
            ), 0) AS total_stays,

            COALESCE((
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
            ), 0) AS active_stays,

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

        ORDER BY
            g.created_at DESC,
            g.id DESC
    `);
}

export async function findGuestByIdentity(documentType, documentNumber) {
    return findGuestByDocument(documentType, documentNumber);
}