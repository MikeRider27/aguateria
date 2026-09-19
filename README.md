# Sistema de gestion para Aguateria

Aplicacion completa para gestionar una aguateria: clientes, productos/inventario y pedidos con control de stock y estados de entrega.

## Stack

- **Frontend:** React 18 + Vite, React Router, Axios. Servido en produccion con Nginx (incluye proxy a `/api`).
- **Backend:** Node.js + Express + Mongoose. Autenticacion con JWT y roles (`admin`, `repartidor`).
- **Base de datos:** MongoDB 7.
- **Todo dockerizado** con `docker-compose`.

## Estructura

```
guateria/
├── backend/          # API REST (Express + MongoDB)
├── frontend/         # SPA (React + Vite), build servido por Nginx
└── docker-compose.yml
```

## Modulos

- **Auth:** login con JWT. Roles `admin` (acceso total) y `repartidor` (sin acceso a Productos ni eliminar registros).
- **Productos:** catalogo con precio, stock y stock minimo (alerta de stock bajo en el dashboard).
- **Clientes:** datos de contacto y direccion de entrega.
- **Pedidos:** carrito de productos por pedido, descuento automatico de inventario al crear, cambio de estado (`pendiente` → `en_camino` → `entregado` / `cancelado`) con restitucion de stock al cancelar o eliminar.
- **Dashboard:** ventas del dia, pedidos pendientes/en camino, clientes activos y alertas de stock bajo.

## Levantar todo con Docker

1. (Opcional) crea un archivo `.env` en la raiz para sobreescribir valores por defecto:

   ```env
   JWT_SECRET=un_secreto_fuerte
   SEED_ADMIN_EMAIL=admin@guateria.com
   SEED_ADMIN_PASSWORD=admin123
   CORS_ORIGIN=http://localhost:8080
   ```

2. Construye y levanta los contenedores:

   ```bash
   docker compose up -d --build
   ```

3. Crea el usuario administrador y datos de ejemplo (productos y clientes):

   ```bash
   docker compose exec backend npm run seed
   ```

4. Abre la aplicacion en [http://localhost:8080](http://localhost:8080) e inicia sesion con:

   - **Email:** `admin@guateria.com`
   - **Password:** `admin123`

   (o los valores que hayas definido en `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

La API queda expuesta tambien en `http://localhost:5000/api` y MongoDB en el puerto `27017` por si necesitas conectarte con una herramienta externa.

## Desarrollo local (sin Docker)

**Backend**

```bash
cd backend
cp .env.example .env   # ajusta MONGO_URI si tu Mongo no corre en Docker
npm install
npm run dev
npm run seed            # crea el admin inicial
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

El frontend en modo dev usa el proxy de Vite (`/api` → `http://localhost:5000`) configurado en `vite.config.js`.

## Gestion de usuarios

Solo un usuario `admin` puede crear nuevos usuarios (`POST /api/auth/register`, protegido). Para dar de alta un repartidor, inicia sesion como admin y usa esa ruta con el token en el header `Authorization: Bearer <token>`.

## Autor

-   **Miguel Villalba**
-   📧 mike.mavc27@gmail.com

------------------------------------------------------------------------

## Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo
[LICENSE](LICENSE) para más detalles.
