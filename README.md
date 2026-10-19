# Planificación diaria

Planificación personal o de un negocio: disciplinas diarias, pendientes, finanzas y nutrición.
Una sola API y dos aplicaciones que la usan.

| Carpeta | Qué es | Tecnología |
|---|---|---|
| [`backend/`](backend/README.md) | API REST con login, base de datos e informe en Excel | Spring Boot 4.1 (Java 21) + PostgreSQL 17 |
| [`web/`](web/README.md) | Aplicación web | React 19 + Vite + Tailwind CSS + Motion |
| [`mobile/`](mobile/README.md) | App nativa para Android e iOS | Flutter 3.47 (Dart) + Riverpod |

## Arrancar en local

1. **Base de datos y API** (en una terminal):

   ```bash
   cd backend
   docker compose up -d          # PostgreSQL en localhost:5433
   ./mvnw spring-boot:run        # API en http://localhost:8080
   ```

2. **Web** (en otra terminal):

   ```bash
   cd web
   npm install
   npm run dev                   # http://localhost:5173
   ```

3. **App móvil** (con un emulador de Android abierto o un teléfono conectado):

   ```bash
   cd mobile
   flutter pub get
   flutter run
   ```

   En un teléfono físico hay que indicar la IP del PC: `flutter run --dart-define=API_URL=http://192.168.1.50:8080/api`.

Usuario de prueba: `demo@planificacion.dev` / `demo12345`.

## Tipos de cuenta

Al registrarse se elige **Personal** (todos los módulos) o **Empresa** (solo planificación, disciplinas y pendientes,
para gestionar las actividades diarias del negocio). La API rechaza finanzas y nutrición a las cuentas de empresa,
así que la regla vale igual en la web y en el móvil.

## Módulos

- **Planificación diaria**: semana de lunes a domingo, disciplinas marcadas por día con semáforo (🔴 < 40 %, 🟡 40–99 %, 🟢 100 %) y estadísticas de hoy, semana, mes y año.
- **Mis disciplinas**: agregar, editar, reordenar y eliminar disciplinas (icono, nombre, descripción).
- **Pendientes**: tareas con descripción, estado, prioridad y plazo. Se ven como lista o como tarjetas.
- **Finanzas**: entradas y salidas en $ (Zelle, efectivo, USDT) o Bs (efectivo, transferencia, Pago Móvil), tasa BCV, saldos por cuenta, gastos vs costos y gráficos.
- **Nutrición**: diario de comidas con calorías y macros frente a tus objetivos, y registro de peso y composición corporal.

Lo que solo está en la web: cambios de divisas, calculadora, tasa escrita a mano, catálogo de alimentos, objetivos
nutricionales, respaldo `.json` e importación. El informe en Excel se descarga desde las dos.
