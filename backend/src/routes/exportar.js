const router = require('express').Router();
const ExcelJS = require('exceljs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.get('/revisiones', requireAdmin, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.status,
              r.observaciones, r.tiene_auto, r.tiene_equipo,
              e.numero_empleado, e.nombre_completo, e.posicion, e.departamento, e.plaza,
              ra.placas, ra.no_serie, ra.kilometraje, ra.poliza_seguro,
              ra.licencia_numero, ra.llanta_refaccion, ra.comentarios as comentarios_auto,
              re.codigo_barras as cb_equipo, re.marca as marca_equipo,
              re.modelo as modelo_equipo, re.serie as serie_equipo
             FROM revisiones r
             LEFT JOIN empleados e ON r.empleado_id=e.id
             LEFT JOIN revision_auto ra ON ra.revision_id=r.id
             LEFT JOIN revision_equipo re ON re.revision_id=r.id
             WHERE 1=1`;
    const params = [];
    if (desde) { params.push(desde); q += ` AND r.fecha_revision>=$${params.length}`; }
    if (hasta) { params.push(hasta); q += ` AND r.fecha_revision<=$${params.length}`; }
    q += ' ORDER BY r.fecha_revision DESC';
    const { rows } = await pool.query(q, params);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Revisiones');
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha_revision', width: 20 },
      { header: 'Auditor', key: 'auditor_nombre', width: 20 },
      { header: 'No. Empleado', key: 'numero_empleado', width: 14 },
      { header: 'Nombre Empleado', key: 'nombre_completo', width: 30 },
      { header: 'Posición', key: 'posicion', width: 25 },
      { header: 'Departamento', key: 'departamento', width: 25 },
      { header: 'Plaza', key: 'plaza', width: 15 },
      { header: 'Auto Revisado', key: 'tiene_auto', width: 14 },
      { header: 'Placas', key: 'placas', width: 12 },
      { header: 'No. Serie Auto', key: 'no_serie', width: 20 },
      { header: 'Kilometraje', key: 'kilometraje', width: 12 },
      { header: 'Póliza Seguro', key: 'poliza_seguro', width: 15 },
      { header: 'Licencia', key: 'licencia_numero', width: 15 },
      { header: 'Llanta Refacción', key: 'llanta_refaccion', width: 16 },
      { header: 'Comentarios Auto', key: 'comentarios_auto', width: 30 },
      { header: 'Equipo Revisado', key: 'tiene_equipo', width: 15 },
      { header: 'CB Equipo', key: 'cb_equipo', width: 15 },
      { header: 'Marca Equipo', key: 'marca_equipo', width: 15 },
      { header: 'Modelo Equipo', key: 'modelo_equipo', width: 15 },
      { header: 'Serie Equipo', key: 'serie_equipo', width: 20 },
      { header: 'Estatus', key: 'status', width: 12 },
      { header: 'Observaciones', key: 'observaciones', width: 35 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134e4a' } };
    // Sanitize text values to prevent Excel formula injection
    const safe = (v) => {
      if (typeof v !== 'string') return v;
      return /^[=+\-@|%]/.test(v) ? `'${v}` : v;
    };
    rows.forEach(r => {
      ws.addRow({
        ...r,
        auditor_nombre:   safe(r.auditor_nombre),
        nombre_completo:  safe(r.nombre_completo),
        posicion:         safe(r.posicion),
        departamento:     safe(r.departamento),
        plaza:            safe(r.plaza),
        placas:           safe(r.placas),
        no_serie:         safe(r.no_serie),
        comentarios_auto: safe(r.comentarios_auto),
        marca_equipo:     safe(r.marca_equipo),
        modelo_equipo:    safe(r.modelo_equipo),
        serie_equipo:     safe(r.serie_equipo),
        observaciones:    safe(r.observaciones),
        tiene_auto: r.tiene_auto ? 'Sí' : 'No',
        tiene_equipo: r.tiene_equipo ? 'Sí' : 'No',
        llanta_refaccion: r.llanta_refaccion == null ? '' : r.llanta_refaccion ? 'Sí' : 'No',
        fecha_revision: r.fecha_revision ? new Date(r.fecha_revision).toLocaleString('es-MX') : '',
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="SICHE_Revisiones_${new Date().toISOString().slice(0,10)}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
