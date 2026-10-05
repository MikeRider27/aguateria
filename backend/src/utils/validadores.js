// Los montos se manejan en guaranies, que no tienen decimales
const enteroGs = {
  validator: Number.isInteger,
  message: (props) => `${props.path} debe ser un monto entero en guaranies`,
};

module.exports = { enteroGs };
