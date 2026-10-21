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

    if (version > 3) {
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