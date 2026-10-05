// Digito verificador del RUC paraguayo (modulo 11, algoritmo publicado por la SET/DNIT).
// Los caracteres no numericos se reemplazan por su codigo ASCII antes del calculo.
const calcularDV = (numero, basemax = 11) => {
  const normalizado = String(numero)
    .toUpperCase()
    .split('')
    .map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0))))
    .join('');

  let total = 0;
  let k = 2;
  for (let i = normalizado.length - 1; i >= 0; i--) {
    if (k > basemax) k = 2;
    total += Number(normalizado[i]) * k;
    k++;
  }
  const resto = total % 11;
  return resto > 1 ? 11 - resto : 0;
};

module.exports = { calcularDV };
