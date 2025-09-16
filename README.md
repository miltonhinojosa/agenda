# 📒 Manual de instalación — **agenda**
Proyecto final

## ✅ Prerrequisitos
- Node.js 20+ y npm 9+
- Windows / macOS / Linux (CMD/Terminal)

Comprueba:
```bash
node -v
npm -v
```

## 📦 Copiar y preparar el ZIP
1. Coloca `agenda.zip` en cualquier carpeta de tu PC.
2. Descomprime. Debe quedar una carpeta `agenda/`.
3. No borres `agenda/backend/db/agenda.db` (la base ya está lista).

## 🚀 Arrancar el proyecto (desde la **raíz**)
1. Abre CMD/Terminal en la carpeta `agenda/`.
2. Instala dependencias (solo la primera vez):
   ```bash
   npm install
   ```
3. Ejecuta:
   ```bash
   npm run dev
   ```
4. Abre: `http://localhost:5173`

### 🔐 Credenciales
- Usuario: `milton`
- Contraseña: `forevernever`

## 🧠 Qué pasa detrás (rápido)
`npm run dev` levanta el frontend (Vite en **5173**) y el backend (Express en **3000**); el frontend usa `/api` para hablar con el backend.

## 🧰 Si algo no arranca
- **Faltan dependencias:** `npm install` en la raíz (y si persiste, también en `backend/` y `frontend/`).
- **Puerto ocupado:** libera 3000 o 5173, o cambia el puerto en `.env`.
- **Pantalla en blanco:** revisa la consola (F12) por errores de variables.

## 🗂️ Estructura mínima
```
agenda/
├── backend/        # API (Express + SQLite en db/agenda.db)
├── frontend/       # App (Vite + React)
└── package.json    # script "dev" que levanta todo desde la raíz
```
