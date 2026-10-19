# Planificación diaria · Móvil

App nativa para **Android e iOS** hecha con **Flutter**. Usa la misma API que la web
([backend](../backend/README.md)) y la misma paleta y tipografías.

## Arrancar

Con el backend encendido en el PC:

```bash
flutter pub get
flutter run                     # en el emulador o teléfono conectado
```

La app busca la API en:

| Dónde corre | URL por defecto |
|---|---|
| Emulador de Android | `http://10.0.2.2:8080/api` (así ve el emulador al PC) |
| Simulador de iOS | `http://localhost:8080/api` |
| Teléfono físico | hay que indicarla: `flutter run --dart-define=API_URL=http://<IP-del-PC>:8080/api` |

El teléfono y el PC deben estar en la misma red Wi‑Fi. En desarrollo la app usa `http`; para publicarla,
la API debe servirse por `https`.

### Requisitos

- **Android**: Android SDK con las licencias aceptadas (`flutter doctor --android-licenses`) y un emulador
  (créalo desde Android Studio → Device Manager) o un teléfono con depuración USB.
- **iOS**: compilar para iPhone exige una Mac con Xcode; desde Windows solo se puede compilar Android.

## Qué incluye

- Inicio de sesión y registro, con cuenta **Personal** o **Empresa**. La sesión se guarda en el almacenamiento seguro del
  sistema (Keychain en iOS, Keystore en Android) y se renueva sola.
- **Plan**: semana con el avance de cada día, disciplinas del día para marcar y estadísticas con gráficos.
- **Disciplinas**: crear, editar, eliminar y reordenar (mantener pulsado y arrastrar).
- **Pendientes**: filtros, vista de lista o de tarjetas, cambio de estado con un toque.
- **Finanzas** (solo cuentas personales): totales, saldos por cuenta, resumen del mes, gráfico de 6 meses y movimientos.
- **Nutrición** (solo cuentas personales): diario con macros, agregar comidas (de la lista o registro rápido) y registro corporal con gráfico.
- **Informe en Excel** desde la hoja de la cuenta (toca tu avatar arriba a la derecha): se comparte con el menú del sistema.

Los cambios de divisas, el catálogo de alimentos y los objetivos nutricionales se gestionan desde la web.

## Estructura

```
lib/
├── core/          configuración, cliente de la API, formatos y tema (paleta de la web)
├── shared/        encabezado con parallax, tarjetas, gráficos y otras piezas comunes
└── features/      una carpeta por módulo: datos (Riverpod) y pantallas
```

## Pruebas

```bash
flutter analyze
flutter test
```
