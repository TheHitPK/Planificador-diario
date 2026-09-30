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

## Módulos

- **Planificación diaria**: semana actual (lunes a domingo) con checkboxes por disciplina, total por día con semáforo (🔴 < 40 %, 🟡 40–99 %, 🟢 100 %) y estadísticas de hoy, semana, mes y año.
- **Mis disciplinas**: agregar, editar, reordenar y eliminar disciplinas (icono, nombre, descripción).
- **Pendientes**: tareas con nombre, descripción, estado, prioridad y plazo.
- **Finanzas**: entradas y salidas en $ (Zelle, efectivo, USDT) o Bs (efectivo, transferencia, Pago Móvil). Tasa BCV $ y € automática (ve.dolarapi.com) o manual, tasa de compra de USDT, cambios y ventas de divisas, gastos vs costos, saldos por cuenta y calculadora.
- **Nutrición**: diario de comidas con calorías, proteínas, carbohidratos, grasas y fibra frente a tus objetivos; lista de alimentos editable; registro de peso, % de grasa y cintura con gráficos; cálculo de objetivos (Katch-McArdle o Mifflin-St Jeor según tu actividad y meta).

## Estructura

- `src/api/`: cliente HTTP con JWT (renovación automática), sesión, conversión de datos y un store por módulo.
- `src/components`, `src/finance`, `src/nutrition`: la interfaz de cada módulo.
- `backend/`: API REST, ver [backend/README.md](backend/README.md).
