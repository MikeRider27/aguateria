require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Client = require('../models/Client');

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

  const productosCount = await Product.countDocuments();
  if (productosCount === 0) {
    await Product.insertMany([
      { nombre: 'Garrafon', presentacion: '20L', precio: 35, stock: 50, stockMinimo: 10 },
      { nombre: 'Garrafon retornable', presentacion: '20L', precio: 25, stock: 30, stockMinimo: 10 },
      { nombre: 'Botellon', presentacion: '10L', precio: 20, stock: 25, stockMinimo: 5 },
      { nombre: 'Paquete botellas', presentacion: '12 x 600ml', precio: 45, stock: 40, stockMinimo: 10 },
    ]);
    console.log('Productos de ejemplo creados');
  }

  const clientesCount = await Client.countDocuments();
  if (clientesCount === 0) {
    await Client.insertMany([
      { nombre: 'Juan Perez', telefono: '5511223344', direccion: 'Calle Falsa 123' },
      { nombre: 'Maria Lopez', telefono: '5599887766', direccion: 'Av. Reforma 456' },
    ]);
    console.log('Clientes de ejemplo creados');
  }

  console.log('Seed completado');
  process.exit(0);
};

run().catch((error) => {
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});
