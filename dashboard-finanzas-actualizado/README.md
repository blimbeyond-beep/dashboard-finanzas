## Dashboard Financiero Privado

Stack:
- Next.js (App Router) + React
- Tailwind CSS (tema **Dark Luxury**)
- Supabase (Auth + Postgres + RLS)

Incluye:
- Registro de transacciones (ingresos/gastos)
- Panel de métricas
- **Contador de Libertad** (días para los 18) basado en tu fecha de nacimiento
- Proyección de capital a los 18 basada en tu historial (neto mensual promedio)

## Getting Started

### 1) Configura Supabase

1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor** y ejecuta: `supabase_schema.sql`.
3. Ve a **Authentication → Providers** y habilita **Email** (Email/Password).
4. Copia tus credenciales:
   - Project URL
   - anon public key

### 2) Variables de entorno

Copia el ejemplo:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` y coloca tus valores.

### 3) Corre el proyecto

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Abre http://localhost:3000

### 4) Deploy (Vercel)

1. Importa el repo/proyecto en Vercel.
2. En **Project Settings → Environment Variables**, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy.

Notas:
- El frontend usa Supabase con la **anon key**, pero gracias a **RLS** solo puedes leer/escribir tus propios datos.
- Si en tu proyecto Supabase el signup requiere confirmación de email, debes confirmar antes de iniciar sesión.
