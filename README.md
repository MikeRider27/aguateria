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

Pensado para una distribuidora de agua en bidones de Paraguay (montos en guaranies, RUC con digito verificador, zonas de Gran Asuncion).

- **Auth y usuarios:** login con JWT. Roles `admin` (acceso total) y `repartidor` (hoja de ruta, pedidos, clientes y envases; sin acceso a Productos, Zonas ni Usuarios). Pantalla de Usuarios para dar de alta repartidores.
- **Productos:** catalogo con precio en Gs., stock y stock minimo. Los productos **retornables** (bidones 20L/10L) tienen precio de garantia por envase y stock de vacios y dañados.
- **Envases retornables:** libro de movimientos por cliente (entrega / retiro / ajuste) con el saldo de bidones que tiene cada cliente. Inventario por producto: llenos, vacios en planta, en clientes y dañados. Operaciones de planta: llenado, baja por daño, ingreso de envases nuevos y descarte. Filtro de clientes con envases sin movimiento hace +30/60/90 dias.
- **Clientes:** particular o empresa, CI o RUC (el DV se calcula con el algoritmo modulo 11 de la DNIT), telefono y WhatsApp, direccion, barrio, ciudad, zona de reparto y coordenadas GPS.
- **Zonas de reparto:** ciudad, dias de visita y repartidor asignado. Al crear un pedido se asigna automaticamente el repartidor de la zona del cliente.
- **Pedidos:** fecha de entrega programada, garantias por envases nuevos, descuento automatico de inventario. Estados `pendiente` → `en_camino` → `entregado` / `cancelado`. La entrega se confirma registrando los vacios retirados, lo que actualiza el saldo del cliente y el stock de vacios. Un pedido entregado no puede cancelarse ni eliminarse.
- **Hoja de ruta:** vista para el celular del repartidor con los pedidos del dia (y los atrasados), bidones a cargar, monto a cobrar, botones de llamada, WhatsApp y mapa, y clientes de las zonas que se visitan ese dia que todavia no hicieron pedido.
- **Dashboard:** ventas del dia, pedidos para hoy, pendientes/en camino, clientes activos, envases en clientes y alertas de stock bajo.

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

   - **Admin:** `admin@guateria.com` / `admin123` (o los valores de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
   - **Repartidor:** `repartidor@guateria.com` / `repartidor123`

   El seed tambien crea zonas de Gran Asuncion, productos (bidones 20L y 10L retornables, packs) y clientes de ejemplo.

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

Solo un usuario `admin` puede crear o editar usuarios, desde la pantalla **Usuarios** (`/api/users`). Los usuarios no se eliminan: se desactivan.

## Zona horaria

El backend corre con `TZ=America/Asuncion` (definido en `docker-compose.yml`) para que "hoy", la hoja de ruta y los dias de visita coincidan con la hora de Paraguay.

## Autor

-   **Miguel Villalba**
-   📧 mike.mavc27@gmail.com

------------------------------------------------------------------------

## Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo
[LICENSE](LICENSE) para más detalles.
