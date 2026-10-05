-- Tipo de cuenta: personal (todos los módulos) o empresa (planificación, disciplinas y pendientes).
-- Las cuentas que ya existían quedan como personales.
ALTER TABLE users
    ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL'
        CONSTRAINT ck_users_account_type CHECK (account_type IN ('PERSONAL', 'BUSINESS'));
