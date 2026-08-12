const router = require('express').Router();
const ExcelJS = require('exceljs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

async function requireExportOrAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    if (req.user.rol === 'admin') return next();
    try {
      const { rows: [u] } = await pool.query('SELECT can_export_responsivas FROM app_users WHERE id=$1', [req.user.id]);
      if (u?.can_export_responsivas === true) return next();
      return res.status(403).json({ error: 'Sin acceso para exportar' });
    } catch { return res.status(500).json({ error: 'Error interno del servidor' }); }
  });
}

router.get('/revisiones', requireExportOrAdmin, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.status,
              r.observaciones, r.tiene_auto, r.tiene_equipo,
              e.numero_empleado, e.nombre_completo, e.posicion, e.departamento, e.plaza,
              ra.placas, ra.no_serie, ra.kilometraje, ra.poliza_seguro,
              ra.licencia_numero, ra.llanta_refaccion, ra.comentarios as comentarios_auto,
              ra.danos as danos_auto,
              ra.codigo_barras as cb_auto,
              COALESCE(NULLIF(ra.herramienta_snapshot->>'no_activo', ''), ha.no_activo) as no_activo_auto,
              re.codigo_barras as cb_equipo, re.marca as marca_equipo,
              re.modelo as modelo_equipo, re.serie as serie_equipo,
              re.comentarios as comentarios_equipo,
              re.danos as danos_equipo,
              COALESCE(NULLIF(re.herramienta_snapshot->>'no_activo', ''), he.no_activo) as no_activo_equipo
             FROM revisiones r
             LEFT JOIN empleados e ON r.empleado_id=e.id
             LEFT JOIN revision_auto ra ON ra.revision_id=r.id
             LEFT JOIN revision_equipo re ON re.revision_id=r.id
             LEFT JOIN herramientas ha ON ha.id = ra.herramienta_id
             LEFT JOIN herramientas he ON he.id = re.herramienta_id
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
      { header: 'CB Auto', key: 'cb_auto', width: 15 },
      { header: 'No. Activo Auto', key: 'no_activo_auto', width: 16 },
      { header: 'No. Serie Auto', key: 'no_serie', width: 20 },
      { header: 'Kilometraje', key: 'kilometraje', width: 12 },
      { header: 'Póliza Seguro', key: 'poliza_seguro', width: 15 },
      { header: 'Licencia', key: 'licencia_numero', width: 15 },
      { header: 'Llanta Refacción', key: 'llanta_refaccion', width: 16 },
      { header: 'Comentarios Auto', key: 'comentarios_auto', width: 30 },
      { header: 'Daños Auto', key: 'danos_auto_desc', width: 40 },
      { header: 'Equipo Revisado', key: 'tiene_equipo', width: 15 },
      { header: 'CB Equipo', key: 'cb_equipo', width: 15 },
      { header: 'No. Activo Equipo', key: 'no_activo_equipo', width: 18 },
      { header: 'Marca Equipo', key: 'marca_equipo', width: 15 },
      { header: 'Modelo Equipo', key: 'modelo_equipo', width: 15 },
      { header: 'Serie Equipo', key: 'serie_equipo', width: 20 },
      { header: 'Comentarios Equipo', key: 'comentarios_equipo', width: 30 },
      { header: 'Daños Equipo', key: 'danos_equipo_desc', width: 40 },
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
    const parseDanos = (raw) => {
      if (!raw) return '';
      try {
        const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(arr) || arr.length === 0) return '';
        return arr.map(d => `${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}`).join(' | ');
      } catch { return ''; }
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
        cb_auto:          safe(r.cb_auto),
        no_activo_auto:   safe(r.no_activo_auto),
        no_serie:         safe(r.no_serie),
        comentarios_auto: safe(r.comentarios_auto),
        danos_auto_desc:  parseDanos(r.danos_auto),
        cb_equipo:        safe(r.cb_equipo),
        no_activo_equipo: safe(r.no_activo_equipo),
        marca_equipo:     safe(r.marca_equipo),
        modelo_equipo:    safe(r.modelo_equipo),
        serie_equipo:     safe(r.serie_equipo),
        comentarios_equipo: safe(r.comentarios_equipo),
        danos_equipo_desc: parseDanos(r.danos_equipo),
        observaciones:    safe(r.observaciones),
        tiene_auto: r.tiene_auto ? 'Sí' : 'No',
        tiene_equipo: r.tiene_equipo ? 'Sí' : 'No',
        llanta_refaccion: r.llanta_refaccion == null ? '' : r.llanta_refaccion ? 'Sí' : 'No',
        fecha_revision: r.fecha_revision ? new Date(r.fecha_revision).toLocaleString('es-MX', { timeZone: 'America/Tijuana' }) : '',
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
