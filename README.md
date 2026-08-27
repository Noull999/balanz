# Balanz

Control de gastos personales que no se queda en registrar: analiza tus movimientos
y te avisa lo que no ves — en que subiste el gasto, que suscripciones estas pagando
en piloto automatico y cuando te estas por pasar del presupuesto.

## Stack

- **Next.js 16** (App Router) — frontend y backend en el mismo proyecto
- **Postgres en Neon** + **Prisma 7** (via driver adapter `@prisma/adapter-pg`)
- **Tailwind v4** para los estilos, **lucide-react** para los iconos
- **Recharts** para los graficos
- **Vercel** para el deploy

Las recomendaciones son reglas y estadistica sobre tus propios datos — sin IA de por
medio, sin costo por token y con logica que se puede leer y explicar.

## Arrancar en local

```bash
npm install
cp .env.example .env   # y completar DATABASE_URL y AUTH_SECRET
npm run db:migrate
npm run dev
```

## Scripts

| Script | Que hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera el cliente de Prisma y compila |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm run db:migrate` | Crea y aplica una migracion |
| `npm run db:studio` | Explorador visual de la base |

## Modelo de datos

`User` → `Category` (ingreso o gasto, con color e icono) → `Transaction`, y
`Budget` con el limite mensual por categoria. Los montos se guardan en centavos
enteros (`amountCents`) para no arrastrar errores de punto flotante.
