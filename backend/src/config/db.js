const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/guateria';
  await mongoose.connect(uri);
  console.log(`MongoDB conectado: ${mongoose.connection.host}`);
};

module.exports = connectDB;
