# SICHE — Sistema Integral de Control de Herramienta de Empleados

Sistema mobile-first para auditar vehículos y equipos de cómputo asignados a empleados OXXO Región Tijuana.

## Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS (PWA, mobile-first)
- **Auth**: JWT en httpOnly cookie
- **Deploy**: Railway

## Inicio rápido (desarrollo local)

### Requisitos
- Node.js 18+
- PostgreSQL local o Railway DATABASE_URL

### Backend
```bash
cd backend
cp .env.example .env   # Editar DATABASE_URL y JWT_SECRET
npm install
node src/migrate.js    # Crea tablas y usuario admin
npm run dev            # Puerto 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Puerto 5173 (proxy → 3001)
```

## Credenciales iniciales

- Usuario: `admin`
- Contraseña: `Admin2026!`

## Deploy en Railway

1. Conectar el repo a Railway
2. Configurar variables de entorno: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`
3. Railway usa `railway.toml` para build y start automáticamente
