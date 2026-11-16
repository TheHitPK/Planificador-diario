-- =====================================================================
--  Planificación diaria · esquema inicial
--  Convenciones:
--   * PK UUID (generadas por la app; DEFAULT para inserts manuales).
--   * Enums como VARCHAR + CHECK: más fáciles de evolucionar que los ENUM de Postgres.
--   * Toda fila de negocio pertenece a un usuario (user_id) y se borra en cascada con él.
--   * Montos de dinero en NUMERIC (nunca float).
-- =====================================================================

-- ---------------------------------------------------------------------
--  Usuarios y autenticación
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_lower CHECK (email = lower(email))
);

-- Refresh tokens: se guarda solo el hash SHA-256, nunca el token en claro.
CREATE TABLE refresh_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);

-- ---------------------------------------------------------------------
--  Disciplinas (hábitos diarios) y planificación diaria
-- ---------------------------------------------------------------------
CREATE TABLE disciplines (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name        VARCHAR(80)  NOT NULL,
    icon        VARCHAR(16)  NOT NULL,
    description VARCHAR(500),
    position    INTEGER      NOT NULL DEFAULT 0,
    -- Archivar la oculta de la tabla semanal sin perder su historial.
    archived    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_disciplines_user ON disciplines (user_id, position);

-- Un registro = "cumplí esta disciplina este día". No existir = no cumplida.
CREATE TABLE discipline_checks (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    discipline_id UUID        NOT NULL REFERENCES disciplines (id) ON DELETE CASCADE,
    check_date    DATE        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_discipline_checks_day UNIQUE (discipline_id, check_date)
);
CREATE INDEX ix_discipline_checks_date ON discipline_checks (check_date);

-- ---------------------------------------------------------------------
--  Pendientes
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    priority     VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM'
                 CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    deadline     DATE         NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_tasks_completed_at CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))
);
CREATE INDEX ix_tasks_user_status ON tasks (user_id, status, deadline);

-- ---------------------------------------------------------------------
--  Finanzas
-- ---------------------------------------------------------------------
-- Tasas de cambio (Bs por unidad). BCV: globales (user_id NULL). MANUAL: de cada usuario.
CREATE TABLE exchange_rates (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID          REFERENCES users (id) ON DELETE CASCADE,
    rate_date  DATE          NOT NULL,
    currency   VARCHAR(3)    NOT NULL CHECK (currency IN ('USD', 'EUR')),
    rate       NUMERIC(19, 6) NOT NULL CHECK (rate > 0),
    source     VARCHAR(10)   NOT NULL CHECK (source IN ('BCV', 'MANUAL')),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_exchange_rates_owner CHECK ((source = 'BCV') = (user_id IS NULL)),
    CONSTRAINT uq_exchange_rates UNIQUE NULLS NOT DISTINCT (rate_date, currency, source, user_id)
);
CREATE INDEX ix_exchange_rates_lookup ON exchange_rates (currency, rate_date DESC);

-- Entradas y salidas de dinero. Un cambio/venta de divisas son DOS filas
-- (una salida y una entrada) unidas por transfer_group_id.
CREATE TABLE movements (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind              VARCHAR(10)    NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
    movement_date     DATE           NOT NULL,
    account           VARCHAR(20)    NOT NULL
                      CHECK (account IN ('ZELLE', 'CASH_USD', 'USDT', 'CASH_VES', 'BANK_TRANSFER', 'PAGO_MOVIL')),
    amount            NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    description       VARCHAR(255),
    income_type       VARCHAR(20)
                      CHECK (income_type IN ('SALARY', 'SALE', 'SERVICE', 'EXCHANGE', 'GIFT', 'LOAN', 'REFUND', 'OTHER')),
    expense_reason    VARCHAR(20)
                      CHECK (expense_reason IN ('PURCHASE', 'PAYMENT', 'CURRENCY_SALE', 'EXCHANGE', 'OTHER')),
    expense_class     VARCHAR(10)    CHECK (expense_class IN ('EXPENSE', 'COST')),
    category          VARCHAR(50),
    -- Tasas BCV del día del movimiento (snapshot: no cambian si luego sube el dólar)
    rate_usd          NUMERIC(19, 6) NOT NULL CHECK (rate_usd > 0),
    rate_eur          NUMERIC(19, 6) NOT NULL CHECK (rate_eur > 0),
    -- Solo cuenta USDT: Bs por USDT de compra (entrada) o de costo (salida)
    usdt_rate         NUMERIC(19, 6) CHECK (usdt_rate > 0),
    transfer_group_id UUID,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_movements_kind_fields CHECK (
        (kind = 'INCOME'  AND income_type IS NOT NULL AND expense_reason IS NULL AND expense_class IS NULL)
     OR (kind = 'EXPENSE' AND expense_reason IS NOT NULL AND income_type IS NULL)
    ),
    CONSTRAINT ck_movements_usdt_rate CHECK (usdt_rate IS NULL OR account = 'USDT')
);
CREATE INDEX ix_movements_user_date ON movements (user_id, movement_date DESC);
CREATE INDEX ix_movements_transfer ON movements (transfer_group_id) WHERE transfer_group_id IS NOT NULL;

-- ---------------------------------------------------------------------
--  Nutrición
-- ---------------------------------------------------------------------
-- Alimentos: user_id NULL = catálogo global (solo lectura); con user_id = alimento propio.
CREATE TABLE foods (
    id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID           REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(120)   NOT NULL,
    unit       VARCHAR(10)    NOT NULL CHECK (unit IN ('G', 'ML', 'UNIT')),
    portion    NUMERIC(10, 2) NOT NULL CHECK (portion > 0),  -- valores por esta cantidad
    kcal       NUMERIC(10, 2) NOT NULL CHECK (kcal >= 0),
    protein    NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (protein >= 0),
    carbs      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (carbs >= 0),
    fat        NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fat >= 0),
    fiber      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fiber >= 0),
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_foods_user ON foods (user_id);

-- Lo que comiste. Guarda los macros calculados (snapshot) para que editar el alimento no cambie el historial.
CREATE TABLE food_log_entries (
    id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entry_date DATE           NOT NULL,
    meal       VARCHAR(10)    NOT NULL CHECK (meal IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
    food_id    UUID           REFERENCES foods (id) ON DELETE SET NULL,
    name       VARCHAR(120)   NOT NULL,
    amount     NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    unit       VARCHAR(10)    NOT NULL CHECK (unit IN ('G', 'ML', 'UNIT')),
    kcal       NUMERIC(10, 2) NOT NULL CHECK (kcal >= 0),
    protein    NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carbs      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fat        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fiber      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_food_log_user_date ON food_log_entries (user_id, entry_date);

-- Peso y composición corporal: un registro por día.
CREATE TABLE body_measurements (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    measured_on  DATE          NOT NULL,
    weight_kg    NUMERIC(5, 2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 400),
    body_fat_pct NUMERIC(4, 1) CHECK (body_fat_pct BETWEEN 2 AND 70),
    waist_cm     NUMERIC(5, 1) CHECK (waist_cm BETWEEN 30 AND 250),
    note         VARCHAR(255),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_body_measurements_day UNIQUE (user_id, measured_on)
);

-- Perfil nutricional y objetivos diarios (1:1 con el usuario).
CREATE TABLE nutrition_profiles (
    user_id        UUID          PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    sex            VARCHAR(6)    CHECK (sex IN ('MALE', 'FEMALE')),
    birth_date     DATE,
    height_cm      NUMERIC(5, 1) CHECK (height_cm BETWEEN 100 AND 250),
    activity_level VARCHAR(12)   CHECK (activity_level IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'HIGH', 'VERY_HIGH')),
    goal           VARCHAR(15)   CHECK (goal IN ('LOSE_FAT', 'RECOMPOSITION', 'MAINTAIN', 'GAIN_MUSCLE')),
    target_kcal    INTEGER       NOT NULL DEFAULT 2000 CHECK (target_kcal >= 0),
    target_protein INTEGER       NOT NULL DEFAULT 140  CHECK (target_protein >= 0),
    target_carbs   INTEGER       NOT NULL DEFAULT 200  CHECK (target_carbs >= 0),
    target_fat     INTEGER       NOT NULL DEFAULT 60   CHECK (target_fat >= 0),
    target_fiber   INTEGER       NOT NULL DEFAULT 28   CHECK (target_fiber >= 0),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
