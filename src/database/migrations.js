const migration001 = `
CREATE TABLE IF NOT EXISTS hotel_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT 'Hotel Ándale',
    currency TEXT NOT NULL DEFAULT 'PEN',
    timezone TEXT NOT NULL DEFAULT 'America/Lima',
    hourly_enabled INTEGER NOT NULL DEFAULT 1,
    nightly_enabled INTEGER NOT NULL DEFAULT 1,
    checkout_time TEXT NOT NULL DEFAULT '12:00',
    late_checkout_fee_cents INTEGER NOT NULL DEFAULT 0
        CHECK (late_checkout_fee_cents >= 0)
);

CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 2
        CHECK (capacity > 0),
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1))
);

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL,
    number TEXT NOT NULL UNIQUE,
    floor TEXT,
    operational_status TEXT NOT NULL DEFAULT 'AVAILABLE'
        CHECK (operational_status IN (
        'AVAILABLE','OCCUPIED','CLEANING','MAINTENANCE'
        )),
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE IF NOT EXISTS rate_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    billing_mode TEXT NOT NULL
        CHECK (billing_mode IN ('HOURLY','NIGHTLY')),
    duration_hours INTEGER
        CHECK (duration_hours IS NULL OR duration_hours > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    document_type TEXT,
    document_number TEXT,
    phone TEXT,
    nationality TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    guest_id INTEGER NOT NULL,
    billing_mode TEXT NOT NULL
        CHECK (billing_mode IN ('HOURLY','NIGHTLY')),
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
        'PENDING','CONFIRMED','CHECKED_IN',
        'CANCELLED','NO_SHOW'
        )),
    agreed_price_cents INTEGER NOT NULL
        CHECK (agreed_price_cents >= 0),
    notes TEXT,
    created_at TEXT NOT NULL,
    CHECK (start_at < end_at),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (guest_id) REFERENCES guests(id)
);

CREATE TABLE IF NOT EXISTS stays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER UNIQUE,
    room_id INTEGER NOT NULL,
    primary_guest_id INTEGER NOT NULL,
    billing_mode TEXT NOT NULL
        CHECK (billing_mode IN ('HOURLY','NIGHTLY')),
    check_in_at TEXT NOT NULL,
    scheduled_check_out_at TEXT NOT NULL,
    actual_check_out_at TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
    agreed_price_cents INTEGER NOT NULL
        CHECK (agreed_price_cents >= 0),
    CHECK (check_in_at < scheduled_check_out_at),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (primary_guest_id) REFERENCES guests(id)
);

CREATE TABLE IF NOT EXISTS stay_guests (
    stay_id INTEGER NOT NULL,
    guest_id INTEGER NOT NULL,
    PRIMARY KEY (stay_id, guest_id),
    FOREIGN KEY (stay_id) REFERENCES stays(id),
    FOREIGN KEY (guest_id) REFERENCES guests(id)
);

CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stay_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (stay_id) REFERENCES stays(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER,
    stay_id INTEGER,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    method TEXT NOT NULL
        CHECK (method IN (
        'CASH','YAPE','PLIN','CARD','TRANSFER','OTHER'
        )),
    type TEXT NOT NULL DEFAULT 'PAYMENT'
        CHECK (type IN ('PAYMENT','REFUND')),
    reference TEXT,
    created_at TEXT NOT NULL,
    CHECK (
        (reservation_id IS NOT NULL AND stay_id IS NULL)
        OR
        (reservation_id IS NULL AND stay_id IS NOT NULL)
    ),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    FOREIGN KEY (stay_id) REFERENCES stays(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    license_key TEXT,
    payload TEXT,
    signature TEXT,
    activated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_rooms_type
ON rooms(room_type_id);

CREATE INDEX IF NOT EXISTS idx_reservations_room_dates
ON reservations(room_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_stays_room_status
ON stays(room_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_stay
ON stays(room_id) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_payments_stay
ON payments(stay_id);
`;

export async function runMigrations(db) {
    const row = await db.getFirstAsync("PRAGMA user_version");
    let version = row?.user_version ?? 0;

    if (version > 12) {
        throw new Error(
            "Versión de base de datos no compatible."
        );
    }

    if (version === 0) {
        await db.withExclusiveTransactionAsync(async (tx) => {
            await tx.execAsync(migration001);

            await tx.runAsync(
                "INSERT OR IGNORE INTO hotel_settings (id) VALUES (1)"
            );

            await tx.execAsync("PRAGMA user_version = 1");
        });

        version = 1;
    }

    if (version === 1) {
        await migration002(db);
        version = 2;
    }

    if (version === 2) {
        await migration003(db);
        version = 3;
    }

    if (version === 3) {
        await migration004(db);
        version = 4;
    }

    if (version === 4) {
        await migration005(db);
        version = 5;
    }

    if (version === 5) {
        await migration006(db);
        version = 6;
    }

    if (version === 6) {
        await migration007(db);
        version = 8;
    }

    if (version === 8) {
        await migration009(db);
        version = 9;
    }

    if (version === 9) {
        await migration010(db);
        version = 10;
    }

    if (version === 10) {
        await migration011(db);
        version = 11;
    }

    if (version === 11) {
        await migration012(db);
        version = 12;
    }

    return version;
}

async function migration002(db) {
    await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.execAsync(`
            ALTER TABLE hotel_settings
            ADD COLUMN is_configured INTEGER NOT NULL DEFAULT 0
            CHECK (is_configured IN (0, 1));
        `);

        await tx.execAsync("PRAGMA user_version = 2");
    });
}

async function migration003(db) {
    await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.execAsync(`
            ALTER TABLE hotel_settings
            ADD COLUMN ruc TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN razon_social TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN nombre_comercial TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN estado_ruc TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN condicion_ruc TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN tipo_establecimiento TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN domicilio_fiscal TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN direccion TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN departamento TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN provincia TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN distrito TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN telefono TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN email TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN logo_uri TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN licencia_municipal TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN registro_hospedaje TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN consulta_ruc_realizada INTEGER NOT NULL DEFAULT 0
            CHECK (consulta_ruc_realizada IN (0, 1));

            ALTER TABLE hotel_settings
            ADD COLUMN consulta_ruc_fecha TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN created_at TEXT;

            ALTER TABLE hotel_settings
            ADD COLUMN updated_at TEXT;

            PRAGMA user_version = 3;
        `);
    });
}

async function migration004(db) {
    await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.execAsync(`
            ALTER TABLE room_types
            ADD COLUMN photo_uri TEXT;

            CREATE TABLE IF NOT EXISTS room_type_amenities (
                room_type_id INTEGER NOT NULL,
                amenity_key TEXT NOT NULL,

                PRIMARY KEY (room_type_id, amenity_key),

                FOREIGN KEY (room_type_id)
                    REFERENCES room_types(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_room_type_amenities_type
            ON room_type_amenities(room_type_id);
        `);

        await tx.runAsync("PRAGMA user_version = 4");
    });
}

async function migration005(db) {
    await db.withExclusiveTransactionAsync(async tx => {
        await tx.execAsync(`
            ALTER TABLE rooms
            ADD COLUMN description TEXT;

            ALTER TABLE rooms
            ADD COLUMN photo_uri TEXT;

            CREATE TABLE IF NOT EXISTS room_amenities (
                room_id INTEGER NOT NULL,
                amenity_key TEXT NOT NULL,
                PRIMARY KEY (room_id, amenity_key),
                FOREIGN KEY (room_id)
                    REFERENCES rooms(id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS room_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                billing_mode TEXT NOT NULL
                    CHECK (billing_mode IN ('HOURLY', 'NIGHTLY')),
                price_cents INTEGER NOT NULL
                    CHECK (price_cents >= 0),
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0,1)),
                UNIQUE (room_id, billing_mode),
                FOREIGN KEY (room_id)
                    REFERENCES rooms(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_room_amenities_room
            ON room_amenities(room_id);
        `);

        await tx.runAsync("PRAGMA user_version = 5");
    });
}

async function migration006(db) {
    await db.withExclusiveTransactionAsync(async tx => {
        await tx.execAsync(`
            CREATE TABLE IF NOT EXISTS hotel_floors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number INTEGER NOT NULL UNIQUE
                    CHECK (number >= 0),
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0,1))
            );
        `);

        await tx.runAsync("PRAGMA user_version = 6");
    });
}

async function migration007(db) {
    await db.withExclusiveTransactionAsync(async tx => {
        const columns = await tx.getAllAsync(
            "PRAGMA table_info(reservations)"
        );

        const existing = new Set(
            columns.map(column => column.name)
        );

        if (!existing.has("booking_code")) {
            await tx.execAsync(
                "ALTER TABLE reservations ADD COLUMN booking_code TEXT"
            );
        }

        if (!existing.has("qr_token")) {
            await tx.execAsync(
                "ALTER TABLE reservations ADD COLUMN qr_token TEXT"
            );
        }

        await tx.execAsync(`
            CREATE UNIQUE INDEX IF NOT EXISTS
                idx_reservations_booking_code
                ON reservations(booking_code);

            CREATE UNIQUE INDEX IF NOT EXISTS
                idx_reservations_qr_token
                ON reservations(qr_token);
        `);

        // Las reservas anteriores reciben un código estable.
        await tx.execAsync(`
            UPDATE reservations
            SET booking_code =
                'RSV-' || printf('%06d', id)
            WHERE booking_code IS NULL;
        `);

        await tx.execAsync("PRAGMA user_version = 8");
    });
}

async function migration009(db) {
    await db.withExclusiveTransactionAsync(async tx => {
        const columns = await tx.getAllAsync(
            "PRAGMA table_info(guests)"
        );

        const existing = new Set(
            columns.map(column => column.name)
        );

        const additions = {
            email: "TEXT",
            birth_date: "TEXT",
            sex: "TEXT",
            origin: "TEXT",
        };

        for (const [name, type] of Object.entries(additions)) {
            if (!existing.has(name)) {
                await tx.execAsync(
                    `ALTER TABLE guests ADD COLUMN ${name} ${type}`
                );
            }
        }

        await tx.execAsync("PRAGMA user_version = 9");
    });
}

async function migration010(db) {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cash_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            opened_at TEXT NOT NULL,
            closed_at TEXT,

            opening_amount_cents INTEGER NOT NULL DEFAULT 0
                CHECK(opening_amount_cents >= 0),

            closing_amount_cents INTEGER
                CHECK(
                    closing_amount_cents IS NULL
                    OR closing_amount_cents >= 0
                ),

            expected_amount_cents INTEGER,

            difference_cents INTEGER,

            status TEXT NOT NULL DEFAULT 'OPEN'
                CHECK(status IN ('OPEN', 'CLOSED')),

            opening_notes TEXT,
            closing_notes TEXT
        );

        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_cash_one_open_session
        ON cash_sessions(status)
        WHERE status = 'OPEN';

        CREATE TABLE IF NOT EXISTS cash_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            session_id INTEGER NOT NULL,

            type TEXT NOT NULL
                CHECK(type IN ('INCOME', 'EXPENSE')),

            category TEXT NOT NULL,

            description TEXT,

            amount_cents INTEGER NOT NULL
                CHECK(amount_cents > 0),

            payment_method TEXT NOT NULL
                CHECK(payment_method IN (
                    'CASH',
                    'YAPE',
                    'PLIN',
                    'TRANSFER',
                    'CARD'
                )),

            created_at TEXT NOT NULL,

            FOREIGN KEY(session_id)
                REFERENCES cash_sessions(id)
                ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS
            idx_cash_movements_session
        ON cash_movements(session_id);

        CREATE INDEX IF NOT EXISTS
            idx_cash_movements_created
        ON cash_movements(created_at);
    `);
}

async function migration011(db) {
    await db.withExclusiveTransactionAsync(async tx => {
        const columns = await tx.getAllAsync(
            "PRAGMA table_info(payments)"
        );

        const existing = new Set(
            columns.map(column => column.name)
        );

        if (!existing.has("notes")) {
            await tx.execAsync(`
                ALTER TABLE payments
                ADD COLUMN notes TEXT;
            `);
        }

        if (!existing.has("cash_movement_id")) {
            await tx.execAsync(`
                ALTER TABLE payments
                ADD COLUMN cash_movement_id INTEGER
                REFERENCES cash_movements(id)
                ON DELETE RESTRICT;
            `);
        }

        await tx.execAsync(`
            CREATE UNIQUE INDEX IF NOT EXISTS
                idx_payments_cash_movement
            ON payments(cash_movement_id);

            CREATE INDEX IF NOT EXISTS
                idx_payments_reservation
            ON payments(reservation_id);

            CREATE INDEX IF NOT EXISTS
                idx_payments_created
            ON payments(created_at);

            PRAGMA user_version = 11;
        `);
    });
}

async function migration012(db) {
    await db.withExclusiveTransactionAsync(async tx => {
        await tx.execAsync(`
            CREATE TABLE IF NOT EXISTS notification_settings (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                enabled INTEGER NOT NULL DEFAULT 1,
                checkout_alerts INTEGER NOT NULL DEFAULT 1,
                reservation_alerts INTEGER NOT NULL DEFAULT 1,
                room_alerts INTEGER NOT NULL DEFAULT 1,
                cash_alerts INTEGER NOT NULL DEFAULT 1,
                license_alerts INTEGER NOT NULL DEFAULT 1,
                checkout_minutes INTEGER NOT NULL DEFAULT 30,
                reservation_minutes INTEGER NOT NULL DEFAULT 60,
                updated_at TEXT
            );

            INSERT OR IGNORE INTO notification_settings (id)
            VALUES (1);

            CREATE TABLE IF NOT EXISTS local_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_key TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                route TEXT,
                entity_id INTEGER,
                scheduled_at TEXT,
                delivered_at TEXT,
                read_at TEXT,
                expo_notification_id TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_local_notifications_created
            ON local_notifications(created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_local_notifications_read
            ON local_notifications(read_at);
        `);

        await tx.execAsync("PRAGMA user_version = 12");
    });
}
