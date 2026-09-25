# Planificación diaria

Dashboard personal para seguir disciplinas diarias y pendientes. Sin base de datos ni login: todo se guarda en el `localStorage` del navegador.

## Uso

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # genera /dist
```

## Módulos

- **Planificación diaria**: semana actual (lunes a domingo) con checkboxes por disciplina, total por día con semáforo (🔴 < 40 %, 🟡 40–99 %, 🟢 100 %) y estadísticas de hoy, semana, mes y año.
- **Mis disciplinas**: agregar, editar, reordenar y eliminar disciplinas (icono, nombre, descripción).
- **Pendientes**: tareas con nombre, descripción, estado, prioridad y plazo.
- **Finanzas**: entradas y salidas en $ (Zelle, efectivo, USDT) o Bs (efectivo, transferencia, Pago Móvil). Tasa BCV $ y € automática (ve.dolarapi.com) o manual, tasa de compra de USDT, cambios y ventas de divisas, gastos vs costos, saldos por cuenta y calculadora.

> Los datos viven en el navegador: si borras los datos del sitio o cambias de navegador, se pierden.
