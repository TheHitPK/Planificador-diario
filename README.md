# Planificación diaria

Dashboard personal para disciplinas diarias, pendientes, finanzas y nutrición.
Frontend en React + Vite; los datos se guardan en una API Spring Boot + PostgreSQL con login.

## Uso

Primero el backend (ver [backend/README.md](backend/README.md)):

```bash
cd backend
docker compose up -d          # PostgreSQL
./mvnw spring-boot:run        # API en http://localhost:8080
```

Luego el frontend:

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # genera /dist
```

La URL de la API se cambia con `VITE_API_URL` (ver `.env.example`).

### Datos de la versión anterior

Si usabas la app antes de tener servidor, tus datos siguen en el navegador. Al crear tu cuenta aparece
un aviso **“Subir a mi cuenta”** que los migra en un paso (solo con la cuenta vacía). También puedes subir
un respaldo `.json` con **Importar**.

## Tipos de cuenta

Al registrarse se elige **Personal** (todos los módulos) o **Empresa** (solo planificación, disciplinas y pendientes,
para gestionar las actividades diarias del negocio). La API rechaza finanzas y nutrición a las cuentas de empresa.

## Exportar e importar

- **Informe en Excel**: `Exportar → Informe en Excel` descarga un `.xlsx` generado por el servidor, con una hoja de resumen
  (indicadores y gráficos) y una hoja por módulo con el detalle.
- **Respaldo de datos**: `Exportar → Respaldo de datos` descarga un `.json` con todo; es el archivo que acepta `Importar`
  (solo en una cuenta vacía).

## Módulos

- **Planificación diaria**: semana actual (lunes a domingo) con checkboxes por disciplina, total por día con semáforo (🔴 < 40 %, 🟡 40–99 %, 🟢 100 %) y estadísticas de hoy, semana, mes y año.
- **Mis disciplinas**: agregar, editar, reordenar y eliminar disciplinas (icono, nombre, descripción).
- **Pendientes**: tareas con nombre, descripción, estado, prioridad y plazo. Se ven como lista o como tarjetas.
- **Finanzas**: entradas y salidas en $ (Zelle, efectivo, USDT) o Bs (efectivo, transferencia, Pago Móvil). Tasa BCV $ y € automática (ve.dolarapi.com) o manual, tasa de compra de USDT, cambios y ventas de divisas, gastos vs costos, saldos por cuenta y calculadora.
- **Nutrición**: diario de comidas con calorías, proteínas, carbohidratos, grasas y fibra frente a tus objetivos; lista de alimentos editable; registro de peso, % de grasa y cintura con gráficos; cálculo de objetivos (Katch-McArdle o Mifflin-St Jeor según tu actividad y meta).

## Estructura

- `src/api/`: cliente HTTP con JWT (renovación automática), sesión, conversión de datos y un store por módulo.
- `src/components`, `src/finance`, `src/nutrition`: la interfaz de cada módulo.
- `src/ui/`: piezas base (botón, tarjeta, campos, tabla, capas parallax) hechas con Tailwind CSS y Motion.
- `src/styles.css`: solo los tokens de diseño (colores, radios, sombras, animaciones) para Tailwind; no hay CSS por componente.
- `backend/`: API REST, ver [backend/README.md](backend/README.md).
