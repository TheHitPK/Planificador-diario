-- Verificación de correo y recuperación de contraseña.

-- NULL = el usuario aún no confirmó su correo y no puede iniciar sesión.
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Las cuentas que ya existían se dan por verificadas.
UPDATE users SET email_verified_at = created_at;

-- Enlaces de un solo uso enviados por correo. Como con los refresh tokens,
-- solo se guarda el hash SHA-256: el token en claro viaja únicamente en el email.
CREATE TABLE email_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    VARCHAR(20) NOT NULL CONSTRAINT ck_email_tokens_purpose CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_email_tokens_hash UNIQUE (token_hash)
);
CREATE INDEX ix_email_tokens_user ON email_tokens (user_id, purpose, created_at);
