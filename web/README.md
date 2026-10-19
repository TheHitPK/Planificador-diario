# Planificación diaria · Web

Aplicación web en **React 19 + Vite**, con **Tailwind CSS 4** y **Motion** para las animaciones.
Los datos se guardan en la API del [backend](../backend/README.md).

## Uso

Con el backend encendido:

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # genera dist/
```

La URL de la API se cambia con `VITE_API_URL` (ver `.env.example`).

## Exportar e importar

- **Informe en Excel**: `Exportar → Informe en Excel` descarga un `.xlsx` generado por el servidor, con una hoja de resumen
  (indicadores y gráficos) y una hoja por módulo con el detalle.
- **Respaldo de datos**: `Exportar → Respaldo de datos` descarga un `.json` con todo; es el archivo que acepta `Importar`
  (solo en una cuenta vacía).

### Datos de la versión anterior

Si usabas la app antes de tener servidor, tus datos siguen en el navegador. Al crear tu cuenta aparece
un aviso **“Subir a mi cuenta”** que los migra en un paso (solo con la cuenta vacía).

## Estructura

- `src/api/`: cliente HTTP con JWT (renovación automática), sesión, conversión de datos y un store por módulo.
- `src/components`, `src/finance`, `src/nutrition`: la interfaz de cada módulo.
- `src/ui/`: piezas base (botón, tarjeta, campos, tabla, capas parallax) hechas con Tailwind CSS y Motion.
- `src/styles.css`: solo los tokens de diseño (colores, radios, sombras, animaciones) para Tailwind; no hay CSS por componente.
