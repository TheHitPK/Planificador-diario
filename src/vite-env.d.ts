/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Por defecto http://localhost:8080/api */
  readonly VITE_API_URL?: string;
  /** 'true' si el backend envía correos (MAIL_ENABLED=true): muestra "¿Olvidaste tu contraseña?". */
  readonly VITE_EMAIL_ENABLED?: string;
}
