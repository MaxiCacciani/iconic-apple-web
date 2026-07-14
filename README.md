# Iconic — Gestión

Sistema de gestión para **Iconic** (Villa Carlos Paz): venta de iPhones, productos Apple y accesorios. Maneja stock con IMEI, ventas al contado y financiadas en cuotas, plan canje, reservas con seña, agenda de cobros, cartera de clientes con cuenta corriente, reclamos y garantías adjuntas.

**Stack:** React 19 + Vite · Supabase (PostgreSQL + Auth + Storage, con RLS) · Vercel (deploy automático desde `master`).

**Regla de oro:** todos los valores (precios, cuotas, señas, canjes) viven en **USD**; los pesos son equivalencias calculadas con el TC del día. El porqué está en [docs/explicacion.md](docs/explicacion.md).

## Correr local

```bash
cp .env.example .env   # completar con las credenciales de Supabase
npm install
npm run dev            # http://localhost:5173
```

## Documentación

| Documento | Para qué |
|-----------|----------|
| [Tutorial: tu primera venta](docs/tutorial-primera-venta.md) | Recorrido completo stock → venta en cuotas → agenda → cliente |
| [Cómo hacer](docs/como-hacer.md) | Correr local, ejecutar SQL en Supabase, deploy, entorno dev, garantías, vendedores |
| [Referencia](docs/referencia.md) | Pantallas, reglas de negocio, modelo de datos, monedas |
| [Explicación](docs/explicacion.md) | Por qué USD, señas congeladas, saldo derivado, RLS |

## Estructura

```
src/
├── App.jsx              # Estado global, handlers de negocio, derivación de saldos
├── screens/             # Resumen, Stock, Venta, Cobros, Reservas, Clientes, Ventas, Login
├── components/          # Header (nav desktop+móvil), Modal, EquipoPicker, VentaDetalleModal…
├── lib/                 # db.js (Supabase), utils.js (formatos/fechas), validation.js
└── data/data.js         # Categorías, modelos, colores, proveedores
supabase/                # policies.sql (RLS) y migraciones — se pegan en el SQL Editor
```
