import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, timingSafeEqual } from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory & Resilient Server Storage (with Supabase fallback)
interface StoredAnswer {
  id: string;
  entidad: string;
  usuarioNombre: string;
  usuarioEmail: string;
  clues: string;
  nombreUnidad: string;
  categoria: string;
  numeroConsultorios: number;
  numeroConsultorio: number;
  pregunta: string;
  valor: number | null;
  turno?: string;
  tipoRegistro?: string;
  fechaActualizacion: string;
  version: number;
}

interface StoredUnitConfig {
  clues: string;
  entidad: string;
  usuarioNombre: string;
  hasInternet: 'SI' | 'NO' | 'PENDIENTE';
  enabledOffices: number;
  unoperatedOffices: number;
  configuredOffices: number;
  turns: Record<number, string>;
  updatedAt: string;
}

// In-Memory store for quick response and persistence fallback
const answersStore = new Map<string, StoredAnswer>();
const unitConfigs = new Map<string, StoredUnitConfig>();
const adminSessions = new Map<string, number>();
const ADMIN_SESSION_DURATION_MS = 30 * 60 * 1000;

function credentialsMatch(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;
  const provided = Buffer.from(`${username}\0${password}`);
  const expected = Buffer.from(`${expectedUsername}\0${expectedPassword}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function getAdminToken(req: express.Request) {
  const authorization = req.header('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

function hasValidAdminSession(req: express.Request) {
  const token = getAdminToken(req);
  const expiresAt = adminSessions.get(token);
  if (!token || !expiresAt || expiresAt <= Date.now()) {
    if (token) adminSessions.delete(token);
    return false;
  }
  return true;
}

// Lazy Supabase client initialization
let supabaseClient: any = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
    }
  }
  return supabaseClient;
}

function answerToDatabase(answer: StoredAnswer) {
  return {
    fecha_registro: answer.fechaActualizacion,
    tipo_registro: 'respuesta',
    entidad: answer.entidad,
    usuario_nombre: answer.usuarioNombre,
    usuario_email: answer.usuarioEmail,
    clues_imb: answer.clues,
    nombre_de_la_unidad: answer.nombreUnidad,
    internet: null,
    consultorios_habilitados: null,
    consultorio: answer.numeroConsultorio,
    pregunta: answer.pregunta,
    valor: answer.valor,
    turno: answer.turno
  };
}

function answerFromDatabase(row: any): StoredAnswer {
  return {
    id: `${row.clues_imb}_${row.consultorio}_${row.pregunta}`,
    entidad: row.entidad || '',
    usuarioNombre: row.usuario_nombre || '',
    usuarioEmail: row.usuario_email || '',
    clues: row.clues_imb,
    nombreUnidad: row.nombre_de_la_unidad || '',
    categoria: row.categoria_gerencial_ampliada || 'Sin categoría',
    numeroConsultorios: 0,
    numeroConsultorio: Number(row.consultorio),
    pregunta: row.pregunta,
    valor: row.valor === null ? null : Number(row.valor),
    turno: row.turno || '',
    tipoRegistro: 'respuesta',
    fechaActualizacion: row.fecha_registro,
    version: 1
  };
}

function configToDatabase(config: StoredUnitConfig) {
  return {
    fecha_registro: config.updatedAt,
    tipo_registro: 'unidad',
    entidad: config.entidad,
    usuario_nombre: config.usuarioNombre,
    clues_imb: config.clues,
    internet: config.hasInternet,
    consultorios_habilitados: config.enabledOffices,
    consultorio: null,
    pregunta: null,
    valor: null,
    turno: null
  };
}

function officeCountToDatabase(config: StoredUnitConfig) {
  return {
    fecha_registro: config.updatedAt,
    tipo_registro: 'respuesta',
    entidad: config.entidad,
    usuario_nombre: config.usuarioNombre,
    clues_imb: config.clues,
    internet: null,
    consultorios_habilitados: null,
    consultorio: config.configuredOffices,
    pregunta: 'consultorios',
    valor: null,
    turno: null
  };
}

function configFromDatabase(row: any): StoredUnitConfig {
  return {
    clues: row.clues_imb,
    entidad: row.entidad || '',
    usuarioNombre: row.usuario_nombre || '',
    hasInternet: row.internet || 'PENDIENTE',
    enabledOffices: Number(row.consultorios_habilitados) || 0,
    unoperatedOffices: 0,
    configuredOffices: 0,
    turns: {},
    updatedAt: row.fecha_registro
  };
}

async function updateOfficeTurns(config: StoredUnitConfig, sb: ReturnType<typeof getSupabase>) {
  for (const [office, turn] of Object.entries(config.turns)) {
    const officeNumber = Number(office);
    if (!Number.isInteger(officeNumber) || officeNumber <= 0 || !turn) continue;

    for (const answer of answersStore.values()) {
      if (answer.clues.toUpperCase() === config.clues.toUpperCase() && answer.numeroConsultorio === officeNumber) {
        answer.turno = turn;
      }
    }

    if (sb) {
      const { error } = await sb
        .from('respuestas')
        .update({ turno: turn, fecha_registro: config.updatedAt })
        .eq('clues_imb', config.clues)
        .eq('tipo_registro', 'respuesta')
        .eq('consultorio', officeNumber)
        .neq('pregunta', 'consultorios');
      if (error) throw error;
    }
  }
}

function buildAnswerMatrix(answers: StoredAnswer[]) {
  return answers.reduce<Record<string, Record<string, { valor: number | null; turno: string; fechaRegistro: string }>>>((matrix, answer) => {
    const officeKey = String(answer.numeroConsultorio);
    if (!matrix[officeKey]) matrix[officeKey] = {};
    matrix[officeKey][answer.pregunta] = {
      valor: answer.valor,
      turno: answer.turno || '',
      fechaRegistro: answer.fechaActualizacion
    };
    return matrix;
  }, {});
}

// ---------------------- API ROUTES ----------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'IMSS-BIENESTAR Equipamiento API',
    supabaseConnected: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/admin/login/', (req, res) => {
  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');
  if (!credentialsMatch(username, password)) {
    return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
  }

  const token = randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_DURATION_MS);
  return res.json({ success: true, token });
});

app.post('/api/admin/logout/', (req, res) => {
  const token = getAdminToken(req);
  if (token) adminSessions.delete(token);
  return res.json({ success: true });
});

app.get('/api/admin/respuestas/', async (req, res) => {
  if (!hasValidAdminSession(req)) {
    return res.status(401).json({ success: false, message: 'La sesión administrativa no es válida' });
  }

  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('respuestas')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .limit(500);
      if (error) throw error;
      return res.json({ success: true, data: data || [] });
    }

    const storedRows = Array.from(answersStore.values())
      .map(answerToDatabase)
      .sort((first, second) => second.fecha_registro.localeCompare(first.fecha_registro))
      .slice(0, 500)
      .map((row, index) => ({ id: index + 1, ...row }));
    return res.json({ success: true, data: storedRows });
  } catch (error) {
    console.error('Admin responses error:', error);
    return res.status(500).json({ success: false, message: 'No fue posible consultar la base de datos' });
  }
});

// 2. Catalog of Entities
app.get('/api/entidades/', async (req, res) => {
  try {
    const { MEXICAN_ENTITIES } = await import('./src/data/mexicoEntities.ts');
    res.json({
      success: true,
      data: MEXICAN_ENTITIES
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al consultar catálogo de entidades' });
  }
});

// 3. Units by Entity
app.get('/api/unidades/', async (req, res) => {
  try {
    const entidad = (req.query.entidad as string) || '';
    const { INITIAL_MEDICAL_UNITS, getUnitsForEntity } = await import('./src/data/mexicoEntities.ts');
    const units = entidad ? getUnitsForEntity(entidad) : INITIAL_MEDICAL_UNITS;
    res.json({
      success: true,
      data: units,
      total: units.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener unidades médicas' });
  }
});

// 4. Fuzzy search Units by CLUES or Name (filtered by entity if provided)
app.get('/api/unidades/buscar/', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const entidad = (req.query.entidad as string || '').trim().toLowerCase();
    const { INITIAL_MEDICAL_UNITS, getUnitsForEntity } = await import('./src/data/mexicoEntities.ts');

    let pool = entidad ? getUnitsForEntity(req.query.entidad as string) : INITIAL_MEDICAL_UNITS;

    if (q) {
      pool = pool.filter(u =>
        u.clues.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.municipality && u.municipality.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: pool,
      total: pool.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en la búsqueda de unidades' });
  }
});

// 5. Get all responses and configuration for a CLUES unit
app.get('/api/unidades/:clues/respuestas/', async (req, res) => {
  try {
    const clues = (req.params.clues || '').trim().toUpperCase();
    let unitAnswers: StoredAnswer[] = [];
    let general: StoredUnitConfig | null = null;
    const sb = getSupabase();

    if (sb) {
      const [answersResult, configResult, officeCountResult] = await Promise.all([
        sb.from('respuestas').select('*').eq('clues_imb', clues).eq('tipo_registro', 'respuesta').neq('pregunta', 'consultorios'),
        sb.from('respuestas').select('*').eq('clues_imb', clues).eq('tipo_registro', 'unidad').maybeSingle(),
        sb.from('respuestas').select('consultorio').eq('clues_imb', clues).eq('tipo_registro', 'respuesta').eq('pregunta', 'consultorios').maybeSingle()
      ]);
      if (answersResult.error) throw answersResult.error;
      if (officeCountResult.error) throw officeCountResult.error;
      unitAnswers = (answersResult.data || []).map(answerFromDatabase);
      if (configResult.error) {
        console.warn('Unit configuration unavailable:', configResult.error.message);
      } else {
        general = configResult.data ? configFromDatabase(configResult.data) : null;
      }
      if (general && officeCountResult.data) {
        general.configuredOffices = Number(officeCountResult.data.consultorio);
      }
      if (general) {
        unitAnswers.forEach((answer) => {
          if (answer.turno) general!.turns[answer.numeroConsultorio] = answer.turno;
        });
      }

      unitAnswers.forEach((answer) => answersStore.set(answer.id, answer));
      if (general) unitConfigs.set(clues, general);
    } else {
      for (const answer of answersStore.values()) {
        if (answer.clues.toUpperCase() === clues) unitAnswers.push(answer);
      }
      general = unitConfigs.get(clues) || null;
    }

    res.json({
      success: true,
      data: {
        clues,
        respuestas: unitAnswers,
        matriz: buildAnswerMatrix(unitAnswers),
        general,
        total: unitAnswers.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al consultar respuestas de la unidad' });
  }
});

app.delete('/api/unidades/:clues/respuestas/', async (req, res) => {
  try {
    const clues = (req.params.clues || '').trim().toUpperCase();
    const sb = getSupabase();
    let deletedCount = 0;

    if (sb) {
      const rpcResult = await sb.rpc('eliminar_respuestas_unidad', { p_clues: clues });
      if (rpcResult.error?.code === 'PGRST202' || rpcResult.error?.code === '42883') {
        const { data, error } = await sb
          .from('respuestas')
          .delete()
          .eq('clues_imb', clues)
          .eq('tipo_registro', 'respuesta')
          .neq('pregunta', 'consultorios')
          .select('clues_imb');
        if (error) throw error;
        deletedCount = data?.length || 0;
      } else {
        if (rpcResult.error) throw rpcResult.error;
        deletedCount = Number(rpcResult.data) || 0;
      }
    }

    for (const [key, answer] of answersStore.entries()) {
      if (answer.clues.toUpperCase() === clues) answersStore.delete(key);
    }

    res.json({
      success: true,
      message: 'Respuestas de la unidad eliminadas correctamente',
      data: { clues, deletedCount }
    });
  } catch (error) {
    console.error('Delete unit answers error:', error);
    res.status(500).json({ success: false, message: 'No fue posible eliminar las respuestas de la unidad' });
  }
});

// 6. Save unit general config (Internet, consultorios habilitados, turns, etc.)
app.post('/api/unidades/:clues/configuracion/', async (req, res) => {
  try {
    const clues = (req.params.clues || '').trim().toUpperCase();
    const body = req.body;

    const config: StoredUnitConfig = {
      clues,
      entidad: body.entidad || '',
      usuarioNombre: body.usuarioNombre || '',
      hasInternet: body.hasInternet || 'PENDIENTE',
      enabledOffices: Number(body.enabledOffices) || 0,
      unoperatedOffices: Number(body.unoperatedOffices) || 0,
      configuredOffices: Number(body.configuredOffices) || 0,
      turns: body.turns || {},
      updatedAt: new Date().toISOString()
    };

    unitConfigs.set(clues, config);

    const sb = getSupabase();
    if (sb) {
      const row = configToDatabase(config);
      const officeCountRow = officeCountToDatabase(config);
      const existing = await sb.from('respuestas').select('clues_imb').eq('clues_imb', clues).eq('tipo_registro', 'unidad').maybeSingle();
      if (existing.error) throw existing.error;
      const { error } = existing.data
        ? await sb.from('respuestas').update(row).eq('clues_imb', clues).eq('tipo_registro', 'unidad')
        : await sb.from('respuestas').insert(row);
      if (error) throw error;

      const existingCount = await sb.from('respuestas').select('clues_imb').eq('clues_imb', clues).eq('tipo_registro', 'respuesta').eq('pregunta', 'consultorios').maybeSingle();
      if (existingCount.error) throw existingCount.error;
      const { error: countError } = existingCount.data
        ? await sb.from('respuestas').update(officeCountRow).eq('clues_imb', clues).eq('tipo_registro', 'respuesta').eq('pregunta', 'consultorios')
        : await sb.from('respuestas').insert(officeCountRow);
      if (countError) throw countError;
      await updateOfficeTurns(config, sb);
    }

    res.json({
      success: true,
      message: 'Configuración general de la unidad guardada exitosamente',
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar configuración general' });
  }
});

// 7. Individual Response Save (POST /api/respuestas/)
app.post('/api/respuestas/', async (req, res) => {
  try {
    const {
      entidad,
      usuarioNombre,
      usuarioEmail,
      clues,
      nombreUnidad,
      categoria,
      numeroConsultorios,
      numeroConsultorio,
      pregunta,
      valor,
      turno,
      tipoRegistro
    } = req.body;

    // Strict validation
    if (!clues || numeroConsultorio === undefined || !pregunta) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros obligatorios faltantes: clues, numeroConsultorio o pregunta'
      });
    }

    if (valor !== null && valor !== undefined && (isNaN(Number(valor)) || Number(valor) < 0 || !Number.isInteger(Number(valor)))) {
      return res.status(400).json({
        success: false,
        message: 'El valor debe ser un número entero mayor o igual a 0, o PENDIENTE (null)'
      });
    }

    const normClues = clues.trim().toUpperCase();
    const key = `${normClues}_${numeroConsultorio}_${pregunta.trim()}`;
    const prev = answersStore.get(key);

    const storedAnswer: StoredAnswer = {
      id: key,
      entidad: entidad || (prev ? prev.entidad : ''),
      usuarioNombre: usuarioNombre || (prev ? prev.usuarioNombre : ''),
      usuarioEmail: usuarioEmail || (prev ? prev.usuarioEmail : ''),
      clues: normClues,
      nombreUnidad: nombreUnidad || (prev ? prev.nombreUnidad : ''),
      categoria: categoria || (prev ? prev.categoria : 'Sin categoría'),
      numeroConsultorios: Number(numeroConsultorios) || (prev ? prev.numeroConsultorios : 1),
      numeroConsultorio: Number(numeroConsultorio),
      pregunta: pregunta.trim(),
      valor: valor !== null && valor !== undefined ? Number(valor) : null,
      turno: turno || (prev ? prev.turno : ''),
      tipoRegistro: tipoRegistro || 'Captura Individual',
      fechaActualizacion: new Date().toISOString(),
      version: (prev?.version || 0) + 1
    };

    answersStore.set(key, storedAnswer);

    // Optional Supabase DB sync if configured
    const sb = getSupabase();
    if (sb) {
      const row = answerToDatabase(storedAnswer);
      const existing = await sb.from('respuestas').select('clues_imb').eq('clues_imb', normClues).eq('tipo_registro', 'respuesta').eq('consultorio', storedAnswer.numeroConsultorio).eq('pregunta', storedAnswer.pregunta).maybeSingle();
      if (existing.error) throw existing.error;
      const { error } = existing.data
        ? await sb.from('respuestas').update(row).eq('clues_imb', normClues).eq('tipo_registro', 'respuesta').eq('consultorio', storedAnswer.numeroConsultorio).eq('pregunta', storedAnswer.pregunta)
        : await sb.from('respuestas').insert(row);
      if (error) throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Respuesta guardada correctamente',
      data: storedAnswer,
      serverTimestamp: storedAnswer.fechaActualizacion
    });
  } catch (error) {
    console.error('Save answer error:', error);
    return res.status(500).json({
      success: false,
      message: 'No fue posible guardar la respuesta en el servidor. El valor se conservará localmente.'
    });
  }
});

// 8. Update Response (PUT /api/respuestas/:id/)
app.put('/api/respuestas/:id/', (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const prev = answersStore.get(id);

    if (!prev) {
      return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
    }

    const updated: StoredAnswer = {
      ...prev,
      ...body,
      fechaActualizacion: new Date().toISOString(),
      version: (prev.version || 1) + 1
    };

    answersStore.set(id, updated);

    res.json({
      success: true,
      message: 'Respuesta actualizada correctamente',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar respuesta' });
  }
});

// 9. Batch Offline Sync (POST /api/sincronizar/)
app.post('/api/sincronizar/', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Se esperaba un arreglo de items' });
    }

    const syncedIds: string[] = [];
    const sb = getSupabase();

    for (const item of items) {
      if (item.action === 'save_answer' && item.payload) {
        const p = item.payload;
        const normClues = (p.clues || '').trim().toUpperCase();
        const key = `${normClues}_${p.numeroConsultorio}_${(p.pregunta || '').trim()}`;
        const prev = answersStore.get(key);

        const stored: StoredAnswer = {
          id: key,
          entidad: p.entidad || '',
          usuarioNombre: p.usuarioNombre || '',
          usuarioEmail: p.usuarioEmail || '',
          clues: normClues,
          nombreUnidad: p.nombreUnidad || '',
          categoria: p.categoria || 'Sin categoría',
          numeroConsultorios: Number(p.numeroConsultorios) || 1,
          numeroConsultorio: Number(p.numeroConsultorio),
          pregunta: p.pregunta,
          valor: p.valor !== undefined && p.valor !== null ? Number(p.valor) : null,
          turno: p.turno || '',
          tipoRegistro: 'Sincronización Offline',
          fechaActualizacion: new Date().toISOString(),
          version: (prev?.version || 0) + 1
        };

        answersStore.set(key, stored);
        if (sb) {
          const row = answerToDatabase(stored);
          const existing = await sb.from('respuestas').select('clues_imb').eq('clues_imb', normClues).eq('tipo_registro', 'respuesta').eq('consultorio', stored.numeroConsultorio).eq('pregunta', stored.pregunta).maybeSingle();
          if (existing.error) throw existing.error;
          const { error } = existing.data
            ? await sb.from('respuestas').update(row).eq('clues_imb', normClues).eq('tipo_registro', 'respuesta').eq('consultorio', stored.numeroConsultorio).eq('pregunta', stored.pregunta)
            : await sb.from('respuestas').insert(row);
          if (error) throw error;
        }
        syncedIds.push(item.id);
      } else if (item.action === 'save_general' && item.payload) {
        const p = item.payload;
        const normClues = (p.clues || '').trim().toUpperCase();
        const config: StoredUnitConfig = {
          clues: normClues,
          entidad: p.entidad || '',
          usuarioNombre: p.usuarioNombre || '',
          hasInternet: p.hasInternet || 'PENDIENTE',
          enabledOffices: Number(p.enabledOffices) || 0,
          unoperatedOffices: Number(p.unoperatedOffices) || 0,
          configuredOffices: Number(p.configuredOffices) || 0,
          turns: p.turns || {},
          updatedAt: new Date().toISOString()
        };
        unitConfigs.set(normClues, config);
        if (sb) {
          const row = configToDatabase(config);
          const existing = await sb.from('respuestas').select('clues_imb').eq('clues_imb', normClues).eq('tipo_registro', 'unidad').maybeSingle();
          if (existing.error) throw existing.error;
          const { error } = existing.data
            ? await sb.from('respuestas').update(row).eq('clues_imb', normClues).eq('tipo_registro', 'unidad')
            : await sb.from('respuestas').insert(row);
          if (error) throw error;
          await updateOfficeTurns(config, sb);
        }
        syncedIds.push(item.id);
      }
    }

    res.json({
      success: true,
      message: `Sincronización completada exitosamente (${syncedIds.length} elementos procesados)`,
      data: { syncedIds }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error durante la sincronización' });
  }
});

// 10. Equipment Catalog
app.get('/api/equipamiento/', async (req, res) => {
  try {
    const { EQUIPMENT_CATALOG } = await import('./src/data/equipmentCatalog.ts');
    res.json({
      success: true,
      data: EQUIPMENT_CATALOG,
      total: EQUIPMENT_CATALOG.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al consultar catálogo de equipamiento' });
  }
});

// 11. Unlock Unit Authentication Verification
app.post('/api/auth/unlock/', (req, res) => {
  const { password } = req.body;
  // Standard IMSS-Bienestar administrative pin/passwords
  if (password === 'imss2026' || password === 'bienestar' || password === 'admin' || password === '1234') {
    return res.json({ success: true, message: 'Autorización concedida' });
  }
  return res.status(401).json({ success: false, message: 'Clave de desbloqueo incorrecta' });
});

// ---------------------- VITE / STATIC SERVING ----------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IMSS-BIENESTAR Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
