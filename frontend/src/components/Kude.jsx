import { fecha, gs, numero } from '../utils/format';

const TIPO_DOC = { ruc: 'RUC', ci: 'C.I.', innominado: 'Sin documento' };

// Representacion grafica de la factura electronica (KuDE) para imprimir
const Kude = ({ factura, empresa, modoSifen }) => (
  <div className="kude">
    {factura.estado === 'anulada' && <div className="kude-marca">ANULADA · {factura.motivoAnulacion}</div>}
    {modoSifen === 'simulado' && (
      <div className="kude-marca">DOCUMENTO DE PRUEBA · SIN VALIDEZ FISCAL (SIFEN en modo simulado)</div>
    )}
    <div className="kude-header">
      <div>
        <h3>{empresa?.nombreFantasia || empresa?.razonSocial}</h3>
        <div>{empresa?.razonSocial}</div>
        <div>{empresa?.actividadEconomica}</div>
        <div>
          {empresa?.direccion} · {empresa?.ciudad}
        </div>
        <div>Tel: {empresa?.telefono}</div>
      </div>
      <div>
        <div>
          <strong>RUC: {empresa?.ruc}-{empresa?.dv}</strong>
        </div>
        <div>Timbrado N° {factura.timbrado}</div>
        <div>Vigencia: {fecha(empresa?.timbrado?.fechaInicio)} al {fecha(empresa?.timbrado?.fechaFin)}</div>
        <h3>FACTURA ELECTRONICA</h3>
        <div>
          <strong>N° {factura.numero}</strong>
        </div>
      </div>
    </div>
    <div>
      <strong>Fecha de emision:</strong> {fecha(factura.fecha)} · <strong>Condicion:</strong>{' '}
      {factura.condicion === 'credito' ? 'Credito' : 'Contado'}
    </div>
    <div>
      <strong>Nombre o razon social:</strong> {factura.receptor.nombre} · <strong>{TIPO_DOC[factura.receptor.tipoDocumento]}:</strong>{' '}
      {factura.receptor.documento}
    </div>
    {factura.receptor.direccion && (
      <div>
        <strong>Direccion:</strong> {factura.receptor.direccion}
      </div>
    )}
    <table>
      <thead>
        <tr>
          <th>Cant.</th>
          <th>Descripcion</th>
          <th>Precio unit.</th>
          <th>Exentas</th>
          <th>5%</th>
          <th>10%</th>
        </tr>
      </thead>
      <tbody>
        {factura.items.map((i, idx) => (
          <tr key={idx}>
            <td>{i.cantidad}</td>
            <td>{i.descripcion}</td>
            <td className="num">{numero(i.precioUnitario)}</td>
            <td className="num">{i.iva === 0 ? numero(i.total) : ''}</td>
            <td className="num">{i.iva === 5 ? numero(i.total) : ''}</td>
            <td className="num">{i.iva === 10 ? numero(i.total) : ''}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={3}>
            <strong>Subtotal</strong>
          </td>
          <td className="num">{numero(factura.totales.exenta)}</td>
          <td className="num">{numero(factura.totales.gravada5)}</td>
          <td className="num">{numero(factura.totales.gravada10)}</td>
        </tr>
        <tr>
          <td colSpan={5}>
            <strong>Total a pagar</strong>
          </td>
          <td className="num">
            <strong>{gs(factura.totales.total)}</strong>
          </td>
        </tr>
        <tr>
          <td colSpan={6}>
            <strong>Liquidacion del IVA:</strong> (5%) {numero(factura.totales.iva5)} · (10%) {numero(factura.totales.iva10)} ·
            Total IVA {numero(factura.totales.iva5 + factura.totales.iva10)}
          </td>
        </tr>
      </tbody>
    </table>
    {factura.sifen?.cdc && (
      <div>
        <strong>CDC:</strong> <span className="cdc">{factura.sifen.cdc.replace(/(\d{4})/g, '$1 ').trim()}</span>
        <div className="muted">Consulte la validez en https://ekuatia.set.gov.py/consultas</div>
      </div>
    )}
  </div>
);

export default Kude;
