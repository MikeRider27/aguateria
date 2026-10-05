require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const userRoutes = require('./routes/userRoutes');
const envaseRoutes = require('./routes/envaseRoutes');
const rutaRoutes = require('./routes/rutaRoutes');
const cobroRoutes = require('./routes/cobroRoutes');
const cuentaRoutes = require('./routes/cuentaRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const facturaRoutes = require('./routes/facturaRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const equipoRoutes = require('./routes/equipoRoutes');
const suscripcionRoutes = require('./routes/suscripcionRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const { iniciarProgramador } = require('./services/suscripciones');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ estado: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/users', userRoutes);
app.use('/api/envases', envaseRoutes);
app.use('/api/ruta', rutaRoutes);
app.use('/api/cobros', cobroRoutes);
app.use('/api/cuentas', cuentaRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/equipos', equipoRoutes);
app.use('/api/suscripciones', suscripcionRoutes);
app.use('/api/reportes', reporteRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
    // Genera los pedidos de suscripciones al iniciar y luego cada hora
    iniciarProgramador();
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

start();
