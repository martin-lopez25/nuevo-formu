import { createClient } from '@supabase/supabase-js';
import { MexicanEntity, MedicalUnit, QuestionAnswer, EquipmentItem, SyncQueueItem, UnitGeneralData } from '../types.ts';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const adminAuth = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'imss-admin-auth'
      }
    })
  : null;

function requireSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

function answerRow(payload: Parameters<typeof saveSingleAnswer>[0]) {
  return {
    fecha_registro: new Date().toISOString(),
    tipo_registro: 'respuesta',
    entidad: payload.entidad,
    usuario_nombre: payload.usuarioNombre,
    usuario_email: payload.usuarioEmail,
    clues_imb: payload.clues.trim().toUpperCase(),
    nombre_de_la_unidad: payload.nombreUnidad,
    internet: null,
    consultorios_habilitados: null,
    consultorio: payload.numeroConsultorio,
    pregunta: payload.pregunta.trim(),
    valor: payload.valor,
    turno: payload.turno || null
  };
}

async function saveAnswerRow(payload: Parameters<typeof saveSingleAnswer>[0]) {
  const client = requireSupabase();
  const row = answerRow(payload);
  const query = client
    .from('respuestas')
    .select('id')
    .eq('clues_imb', row.clues_imb)
    .eq('tipo_registro', 'respuesta')
    .eq('consultorio', row.consultorio)
    .eq('pregunta', row.pregunta)
    .maybeSingle();
  const existing = await query;
  if (existing.error) throw existing.error;

  const result = existing.data
    ? await client.from('respuestas').update(row).eq('id', existing.data.id)
    : await client.from('respuestas').insert(row);
  if (result.error) throw result.error;
  return row.fecha_registro;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  serverTimestamp?: string;
  version?: number;
}

export interface AdminResponseRow {
  id: number;
  fecha_registro: string;
  tipo_registro: 'unidad' | 'respuesta';
  entidad: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  clues_imb: string;
  nombre_de_la_unidad: string | null;
  internet: string | null;
  consultorios_habilitados: number | null;
  consultorio: number | null;
  pregunta: string | null;
  valor: number | null;
  turno: string | null;
}

async function adminPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('El servidor administrativo no está disponible en este sitio. Configure la URL del backend.');
  }
  return response.json();
}

async function fetchAdminApi(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error('La API administrativa aún no está desplegada o no se puede conectar.');
  }
}

export async function authenticateAdmin(username: string, password: string): Promise<string> {
  if (!adminAuth) throw new Error('El servicio de acceso no está configurado');
  const normalizedUsername = username.trim().toLowerCase();
  const { data, error } = await adminAuth.auth.signInWithPassword({
    email: `${normalizedUsername}@admin.example.com`,
    password: await adminPassword(password)
  });
  if (error || !data.session?.access_token) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  return data.session.access_token;
}

export async function logoutAdmin(token: string): Promise<void> {
  if (!token || !adminAuth) return;
  await adminAuth.auth.signOut({ scope: 'local' });
}

export async function fetchAdminResponses(token: string): Promise<AdminResponseRow[]> {
  const response = await fetchAdminApi(`${API_BASE}/admin/respuestas/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await readApiResponse(response);
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'No fue posible consultar la base de datos');
  }
  return json.data || [];
}

export async function checkServerHealth(): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('respuestas').select('id', { head: true, count: 'exact' }).limit(1);
    return !error;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/health`, { credentials: 'omit', signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchEntities(): Promise<MexicanEntity[]> {
  if (supabase) {
    const { MEXICAN_ENTITIES } = await import('../data/mexicoEntities.ts');
    return MEXICAN_ENTITIES;
  }

  try {
    const res = await fetch(`${API_BASE}/entidades/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.warn('API entities fetch error, using local catalog:', err);
    const { MEXICAN_ENTITIES } = await import('../data/mexicoEntities.ts');
    return MEXICAN_ENTITIES;
  }
}

export async function fetchUnitsByEntity(entityName: string): Promise<MedicalUnit[]> {
  if (supabase) {
    const { getUnitsForEntity } = await import('../data/mexicoEntities.ts');
    return getUnitsForEntity(entityName);
  }

  try {
    const res = await fetch(`${API_BASE}/unidades/?entidad=${encodeURIComponent(entityName)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.warn('API units fetch error, using local generator:', err);
    const { getUnitsForEntity } = await import('../data/mexicoEntities.ts');
    return getUnitsForEntity(entityName);
  }
}

export async function searchUnits(query: string, entityName?: string): Promise<MedicalUnit[]> {
  if (supabase) {
    const { INITIAL_MEDICAL_UNITS, getUnitsForEntity } = await import('../data/mexicoEntities.ts');
    const all = entityName ? getUnitsForEntity(entityName) : INITIAL_MEDICAL_UNITS;
    const normalizedQuery = query.trim().toLowerCase();
    return all.filter((unit) =>
      unit.clues.toLowerCase().includes(normalizedQuery) ||
      unit.name.toLowerCase().includes(normalizedQuery) ||
      unit.municipality?.toLowerCase().includes(normalizedQuery)
    );
  }

  try {
    const params = new URLSearchParams();
    params.set('q', query);
    if (entityName) params.set('entidad', entityName);
    const res = await fetch(`${API_BASE}/unidades/buscar/?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.warn('API search error, fallback fuzzy search:', err);
    const { INITIAL_MEDICAL_UNITS, getUnitsForEntity } = await import('../data/mexicoEntities.ts');
    const all = entityName ? getUnitsForEntity(entityName) : INITIAL_MEDICAL_UNITS;
    const q = query.trim().toLowerCase();
    return all.filter(
      (u) =>
        u.clues.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.municipality?.toLowerCase().includes(q)
    );
  }
}

export async function fetchUnitResponses(clues: string): Promise<{ answers: Record<string, QuestionAnswer>; general?: UnitGeneralData }> {
  if (supabase) {
    const normalizedClues = clues.trim().toUpperCase();
    const { data, error } = await supabase
      .from('respuestas')
      .select('*')
      .eq('clues_imb', normalizedClues);
    if (error) throw error;

    const answers: Record<string, QuestionAnswer> = {};
    const turns: UnitGeneralData['turns'] = {};
    const rows = data || [];
    const config = rows.find((row) => row.tipo_registro === 'unidad');
    const officeCount = rows.find((row) => row.tipo_registro === 'respuesta' && row.pregunta === 'consultorios');

    rows
      .filter((row) => row.tipo_registro === 'respuesta' && row.pregunta !== 'consultorios')
      .forEach((row) => {
        const officeNumber = Number(row.consultorio);
        if (row.turno) turns[officeNumber] = row.turno;
        answers[`${officeNumber}__${row.pregunta}`] = {
          clues: normalizedClues,
          officeNumber,
          question: row.pregunta,
          value: row.valor === null ? null : Number(row.valor),
          status: 'saved_cloud',
          turn: row.turno || '',
          updatedAt: row.fecha_registro || new Date().toISOString(),
          version: 1
        };
      });

    const general = config ? {
      clues: normalizedClues,
      entidad: config.entidad || '',
      usuarioNombre: config.usuario_nombre || '',
      hasInternet: config.internet || 'PENDIENTE',
      enabledOffices: Number(config.consultorios_habilitados) || 0,
      unoperatedOffices: 0,
      configuredOffices: Number(officeCount?.consultorio) || 0,
      turns,
      updatedAt: config.fecha_registro || new Date().toISOString()
    } satisfies UnitGeneralData : undefined;

    return { answers, general };
  }

  try {
    const res = await fetch(`${API_BASE}/unidades/${encodeURIComponent(clues)}/respuestas/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const answers: Record<string, QuestionAnswer> = {};
    if (json.data?.matriz && Object.keys(json.data.matriz).length > 0) {
      Object.entries(json.data.matriz).forEach(([officeNumber, questions]) => {
        Object.entries(questions as Record<string, any>).forEach(([question, cell]) => {
          const numericOffice = Number(officeNumber);
          answers[`${numericOffice}__${question}`] = {
            clues,
            officeNumber: numericOffice,
            question,
            value: cell.valor,
            status: 'saved_cloud',
            turn: cell.turno,
            updatedAt: cell.fechaRegistro || new Date().toISOString()
          };
        });
      });
    } else if (json.data && Array.isArray(json.data.respuestas)) {
      json.data.respuestas.forEach((r: any) => {
        const k = `${r.numeroConsultorio || r.officeNumber}__${r.pregunta || r.question}`;
        answers[k] = {
          clues: r.clues,
          officeNumber: r.numeroConsultorio || r.officeNumber,
          question: r.pregunta || r.question,
          value: r.valor !== undefined ? r.valor : r.value,
          status: 'saved_cloud',
          turn: r.turno || r.turn,
          updatedAt: r.fechaActualizacion || r.updatedAt || new Date().toISOString(),
          version: r.version || 1
        };
      });
    }
    return {
      answers,
      general: json.data?.general
    };
  } catch (err) {
    console.warn('API unit responses error:', err);
    return { answers: {} };
  }
}

export async function saveSingleAnswer(payload: {
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
  version?: number;
}): Promise<ApiResponse> {
  if (supabase) {
    const serverTimestamp = await saveAnswerRow(payload);
    return { success: true, message: 'Respuesta guardada correctamente', serverTimestamp };
  }

  const res = await fetch(`${API_BASE}/respuestas/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      fechaActualizacion: new Date().toISOString()
    })
  });

  const json = await res.json();
  if (!res.ok && !json.success) {
    throw new Error(json.message || 'No fue posible guardar la respuesta');
  }
  return json;
}

export async function saveUnitGeneral(clues: string, generalData: UnitGeneralData): Promise<ApiResponse> {
  if (supabase) {
    const client = requireSupabase();
    const normalizedClues = clues.trim().toUpperCase();
    const timestamp = new Date().toISOString();
    const configRow = {
      fecha_registro: timestamp,
      tipo_registro: 'unidad',
      entidad: generalData.entidad || '',
      usuario_nombre: generalData.usuarioNombre || '',
      clues_imb: normalizedClues,
      internet: generalData.hasInternet,
      consultorios_habilitados: generalData.enabledOffices,
      consultorio: null,
      pregunta: null,
      valor: null,
      turno: null
    };
    const countRow = {
      fecha_registro: timestamp,
      tipo_registro: 'respuesta',
      entidad: generalData.entidad || '',
      usuario_nombre: generalData.usuarioNombre || '',
      clues_imb: normalizedClues,
      internet: null,
      consultorios_habilitados: null,
      consultorio: generalData.configuredOffices,
      pregunta: 'consultorios',
      valor: null,
      turno: null
    };

    const existingConfig = await client.from('respuestas').select('id').eq('clues_imb', normalizedClues).eq('tipo_registro', 'unidad').maybeSingle();
    if (existingConfig.error) throw existingConfig.error;
    const configResult = existingConfig.data
      ? await client.from('respuestas').update(configRow).eq('id', existingConfig.data.id)
      : await client.from('respuestas').insert(configRow);
    if (configResult.error) throw configResult.error;

    const existingCount = await client.from('respuestas').select('id').eq('clues_imb', normalizedClues).eq('tipo_registro', 'respuesta').eq('pregunta', 'consultorios').maybeSingle();
    if (existingCount.error) throw existingCount.error;
    const countResult = existingCount.data
      ? await client.from('respuestas').update(countRow).eq('id', existingCount.data.id)
      : await client.from('respuestas').insert(countRow);
    if (countResult.error) throw countResult.error;

    for (const [officeNumber, turn] of Object.entries(generalData.turns)) {
      if (!turn) continue;
      const { error } = await client
        .from('respuestas')
        .update({ turno: turn, fecha_registro: timestamp })
        .eq('clues_imb', normalizedClues)
        .eq('tipo_registro', 'respuesta')
        .eq('consultorio', Number(officeNumber))
        .neq('pregunta', 'consultorios');
      if (error) throw error;
    }

    return { success: true, message: 'Configuración general guardada', data: generalData, serverTimestamp: timestamp };
  }

  const res = await fetch(`${API_BASE}/unidades/${encodeURIComponent(clues)}/configuracion/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(generalData)
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'No fue posible guardar la configuración de la unidad');
  }
  return json;
}

export async function deleteUnitAnswers(clues: string): Promise<ApiResponse<{ deletedCount: number }>> {
  if (supabase) {
    const { data, error } = await supabase.rpc('eliminar_respuestas_unidad', { p_clues: clues.trim().toUpperCase() });
    if (error) throw error;
    return { success: true, data: { deletedCount: Number(data) || 0 } };
  }

  const res = await fetch(`${API_BASE}/unidades/${encodeURIComponent(clues)}/respuestas/`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'No fue posible eliminar las respuestas de la unidad');
  }
  return json;
}

export async function syncBatchQueue(items: SyncQueueItem[]): Promise<ApiResponse<{ syncedIds: string[] }>> {
  if (supabase) {
    const syncedIds: string[] = [];
    for (const item of items) {
      if (item.action === 'save_answer') {
        await saveSingleAnswer(item.payload as Parameters<typeof saveSingleAnswer>[0]);
      } else if (item.action === 'save_general') {
        await saveUnitGeneral(item.clues, item.payload as unknown as UnitGeneralData);
      }
      syncedIds.push(item.id);
    }
    return { success: true, data: { syncedIds } };
  }

  const res = await fetch(`${API_BASE}/sincronizar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  return res.json();
}

