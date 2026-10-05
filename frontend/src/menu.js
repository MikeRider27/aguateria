// Menu lateral y permisos por rol de cada pagina (sin `roles` = todos los usuarios)
export const MENU = [
  { ruta: '/', texto: 'Dashboard' },
  { ruta: '/ruta', texto: 'Hoja de ruta' },
  { ruta: '/pedidos', texto: 'Pedidos' },
  { ruta: '/clientes', texto: 'Clientes' },
  { ruta: '/envases', texto: 'Envases' },
  { ruta: '/cobros', texto: 'Cobros', roles: ['admin', 'cajero', 'repartidor'] },
  { ruta: '/cuentas', texto: 'Cuentas corrientes', roles: ['admin', 'cajero', 'vendedor'] },
  { ruta: '/caja', texto: 'Caja', roles: ['admin', 'cajero', 'repartidor'] },
  { ruta: '/facturas', texto: 'Facturas', roles: ['admin', 'cajero'] },
  { ruta: '/productos', texto: 'Productos', roles: ['admin'] },
  { ruta: '/zonas', texto: 'Zonas', roles: ['admin'] },
  { ruta: '/usuarios', texto: 'Usuarios', roles: ['admin'] },
  { ruta: '/empresa', texto: 'Empresa', roles: ['admin'] },
];

export const rolesDe = (ruta) => MENU.find((m) => m.ruta === ruta)?.roles || [];
