require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Zone = require('../models/Zone');
const Empresa = require('../models/Empresa');
const Equipo = require('../models/Equipo');
const Suscripcion = require('../models/Suscripcion');
const { primeraEntrega } = require('../services/suscripciones');

const run = async () => {
  await connectDB();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@guateria.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const adminExiste = await User.findOne({ email: adminEmail });
  if (!adminExiste) {
    await User.create({
      nombre: 'Administrador',
      email: adminEmail,
      password: adminPassword,
      rol: 'admin',
    });
    console.log(`Usuario admin creado -> email: ${adminEmail} / password: ${adminPassword}`);
  } else {
    console.log('El usuario admin ya existe, se omite creacion');
  }

  let repartidor = await User.findOne({ email: 'repartidor@guateria.com' });
  if (!repartidor) {
    repartidor = await User.create({
      nombre: 'Carlos Benitez',
      email: 'repartidor@guateria.com',
      password: 'repartidor123',
      rol: 'repartidor',
      telefono: '0981 456 789',
    });
    console.log('Usuario repartidor creado -> email: repartidor@guateria.com / password: repartidor123');
  }

  if ((await Zone.countDocuments()) === 0) {
    await Zone.insertMany([
      { nombre: 'Asuncion Centro', ciudad: 'Asuncion', diasVisita: ['lunes', 'jueves'], repartidor: repartidor._id },
      { nombre: 'Villa Morra / Recoleta', ciudad: 'Asuncion', diasVisita: ['martes', 'viernes'], repartidor: repartidor._id },
      { nombre: 'Luque', ciudad: 'Luque', diasVisita: ['martes', 'viernes'] },
      { nombre: 'San Lorenzo', ciudad: 'San Lorenzo', diasVisita: ['miercoles', 'sabado'] },
      { nombre: 'Fernando de la Mora', ciudad: 'Fernando de la Mora', diasVisita: ['lunes', 'jueves'] },
      { nombre: 'Lambare', ciudad: 'Lambare', diasVisita: ['miercoles', 'sabado'] },
    ]);
    console.log('Zonas de reparto creadas');
  }

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany([
      { nombre: 'Agua mineral', presentacion: 'Bidon 20L', precio: 15000, stock: 120, stockMinimo: 30, retornable: true, precioGarantia: 30000, stockVacios: 40 },
      { nombre: 'Agua mineral', presentacion: 'Bidon 10L', precio: 10000, stock: 60, stockMinimo: 15, retornable: true, precioGarantia: 20000, stockVacios: 15 },
      { nombre: 'Agua mineral sin gas', presentacion: 'Pack 12 x 500ml', precio: 30000, stock: 50, stockMinimo: 10 },
      { nombre: 'Agua mineral con gas', presentacion: 'Pack 6 x 1,5L', precio: 32000, stock: 30, stockMinimo: 8 },
      { nombre: 'Bomba manual', presentacion: 'Para bidon 20L', precio: 35000, stock: 15, stockMinimo: 5 },
    ]);
    console.log('Productos de ejemplo creados');
  }

  if ((await Client.countDocuments()) === 0) {
    const zonas = new Map((await Zone.find()).map((z) => [z.nombre, z._id]));
    const clientes = [
      { nombre: 'Maria Gonzalez', tipoDocumento: 'ci', documento: '3456789', telefono: '0981 123 456', whatsapp: '595981123456', direccion: 'Tte. Fariña 1234 c/ Brasil', barrio: 'Sajonia', ciudad: 'Asuncion', zona: zonas.get('Asuncion Centro'), referencia: 'Porton negro' },
      { nombre: 'Jose Ramirez', tipoDocumento: 'ci', documento: '4567890', telefono: '0972 654 321', whatsapp: '595972654321', direccion: 'Av. Mcal. Lopez 3500', barrio: 'Villa Morra', ciudad: 'Asuncion', zona: zonas.get('Villa Morra / Recoleta') },
      { tipo: 'empresa', nombre: 'Estudio Contable Benitez S.A.', condicionVenta: 'credito', limiteCredito: 1500000, plazoDias: 30, tipoDocumento: 'ruc', documento: '80012345', telefono: '021 600 700', whatsapp: '595991600700', email: 'admin@estudiobenitez.com.py', direccion: 'Gral. Diaz 555, piso 3', barrio: 'Centro', ciudad: 'Asuncion', zona: zonas.get('Asuncion Centro') },
      { nombre: 'Ana Villalba', tipoDocumento: 'ruc', documento: '2345678', telefono: '0983 222 333', whatsapp: '595983222333', direccion: 'Ruta Luque - San Bernardino km 2', barrio: 'Laurelty', ciudad: 'Luque', zona: zonas.get('Luque') },
      { nombre: 'Pedro Acosta', telefono: '0961 777 888', direccion: 'Mcal. Estigarribia 1500', barrio: 'Barcequillo', ciudad: 'San Lorenzo', zona: zonas.get('San Lorenzo') },
    ];
    for (const c of clientes) await Client.create(c);
    console.log('Clientes de ejemplo creados');
  }

  if (!(await Empresa.findOne())) {
    const anio = new Date().getFullYear();
    await Empresa.create({
      razonSocial: 'Aguateria Ejemplo S.A.',
      nombreFantasia: 'Agua Pura',
      ruc: '80099999',
      direccion: 'Av. Eusebio Ayala 1234',
      ciudad: 'Asuncion',
      telefono: '021 555 000',
      actividadEconomica: 'Elaboracion de aguas minerales y otras aguas embotelladas',
      timbrado: { numero: '12345678', fechaInicio: new Date(anio, 0, 1), fechaFin: new Date(anio + 1, 11, 31) },
    });
    console.log('Datos de empresa de ejemplo creados (timbrado ficticio)');
  }

  if (!(await User.findOne({ email: 'cajero@guateria.com' }))) {
    await User.create({ nombre: 'Laura Caceres', email: 'cajero@guateria.com', password: 'cajero123', rol: 'cajero' });
    console.log('Usuario cajero creado -> email: cajero@guateria.com / password: cajero123');
  }

  if ((await Equipo.countDocuments()) === 0) {
    const empresa = await Client.findOne({ nombre: /Estudio Contable/ });
    const haceCien = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await Equipo.insertMany([
      { codigo: 'DISP-0001', tipo: 'frio_calor', marca: 'Midea', modelo: 'YL1633S', numeroSerie: 'MD16330981', estado: 'comodato', cliente: empresa?._id, contrato: { numero: 'C-2026-001', fechaInicio: haceCien, consumoMinimoMensual: 8, montoGarantia: 0 }, historial: [{ tipo: 'alta' }, { tipo: 'entrega', cliente: empresa?._id, fecha: haceCien }] },
      { codigo: 'DISP-0002', tipo: 'frio_calor', marca: 'Midea', modelo: 'YL1633S', numeroSerie: 'MD16330982', historial: [{ tipo: 'alta' }] },
      { codigo: 'DISP-0003', tipo: 'natural', marca: 'Tokyo', modelo: 'Mesa', historial: [{ tipo: 'alta' }] },
      { codigo: 'BOMBA-0001', tipo: 'bomba_electrica', marca: 'Generica', modelo: 'USB', historial: [{ tipo: 'alta' }] },
    ]);
    console.log('Equipos de ejemplo creados');
  }

  if ((await Suscripcion.countDocuments()) === 0) {
    const jose = await Client.findOne({ nombre: 'Jose Ramirez' });
    const bidon = await Product.findOne({ presentacion: 'Bidon 20L' });
    if (jose && bidon) {
      const datos = { cliente: jose._id, items: [{ producto: bidon._id, cantidad: 2 }], frecuencia: 'semanal', diaSemana: 'viernes' };
      await Suscripcion.create({ ...datos, proximaEntrega: primeraEntrega(datos) });
      console.log('Suscripcion de ejemplo creada');
    }
  }

  console.log('Seed completado');
  process.exit(0);
};

run().catch((error) => {
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});
