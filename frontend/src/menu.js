// Menu lateral y permisos por rol de cada pagina (sin `roles` = todos los usuarios)
export const MENU = [
  { ruta: '/', texto: 'Dashboard' },
  { ruta: '/ruta', texto: 'Hoja de ruta' },
  { ruta: '/pedidos', texto: 'Pedidos' },
  { ruta: '/clientes', texto: 'Clientes' },
  { ruta: '/envases', texto: 'Envases' },
  { ruta: '/productos', texto: 'Productos', roles: ['admin'] },
  { ruta: '/zonas', texto: 'Zonas', roles: ['admin'] },
  { ruta: '/usuarios', texto: 'Usuarios', roles: ['admin'] },
];

export const rolesDe = (ruta) => MENU.find((m) => m.ruta === ruta)?.roles || [];
