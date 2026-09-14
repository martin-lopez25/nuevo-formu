import { createClient } from '@supabase/supabase-js';
import { MexicanEntity, MedicalUnit, QuestionAnswer, EquipmentItem, SyncQueueItem, UnitGeneralData } from '../types.ts';
import {
  DISABLED_CAUSE_CONFIRMATION_QUESTION,
  DISABLED_OFFICE_CAUSES,
  GENERAL_DOCTOR_COUNT_QUESTION,
  getDisabledCauseFromQuestion,
  getDoctorAvailabilityQuestion,
  getOfficeScheduleQuestion,
  OFFICE_ENABLED_QUESTION,
  parseDoctorAvailabilityQuestion,
  parseOfficeScheduleQuestion,
  type OperationalTurn
} from '../data/officeConfiguration.ts';

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

type ScheduleEntry = { turno: OperationalTurn; dia: string; existe_medico: boolean };
type StoredSchedules = Partial<Record<OperationalTurn, {
  dias_con_horario: string[];
  dias_con_medico: string[];
}>>;

function parseStoredSchedules(value: unknown): ScheduleEntry[] {
  if (Array.isArray(value)) return value as ScheduleEntry[];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as StoredSchedules).flatMap(([turno, schedule]) =>
    (schedule?.dias_con_horario || []).map((dia) => ({
      turno: turno as OperationalTurn,
      dia,
      existe_medico: schedule?.dias_con_medico?.includes(dia) || false
    }))
  );
}

function parseStoredCauses(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((cause): cause is string => typeof cause === 'string');
  if (typeof value !== 'string') return [];
  return value.split(',').map((cause) => cause.trim()).filter(Boolean);
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
    consultorio: payload.numeroConsultorio,
    pregunta: payload.pregunta.trim(),
    valor: payload.valor,
    turno: null
  };
}

async function saveAnswerRow(payload: Parameters<typeof saveSingleAnswer>[0]) {
  const client = requireSupabase();
  const normalizedClues = payload.clues.trim().toUpperCase();
  const cause = getDisabledCauseFromQuestion(payload.pregunta);
  const schedule = parseOfficeScheduleQuestion(payload.pregunta);
  const doctorAvailability = parseDoctorAvailabilityQuestion(payload.pregunta);

  if (schedule || doctorAvailability) {
    const slot = schedule || doctorAvailability!;
    const turnAndDay = `${slot.turn} - ${slot.day}`;
    const timestamp = new Date().toISOString();
    const existing = await client.from('respuestas').select('*')
      .eq('clues_imb', normalizedClues)
      .eq('tipo_registro', 'horario')
      .eq('consultorio', payload.numeroConsultorio)
      .eq('turno', turnAndDay)
      .maybeSingle();
    if (existing.error) throw existing.error;

    const row = {
      fecha_registro: timestamp,
      tipo_registro: 'horario',
      entidad: payload.entidad,
      usuario_nombre: payload.usuarioNombre,
      usuario_email: payload.usuarioEmail,
      clues_imb: normalizedClues,
      nombre_de_la_unidad: payload.nombreUnidad,
      consultorio: payload.numeroConsultorio,
      pregunta: null,
      valor: null,
      turno: turnAndDay,
      habilitado: schedule ? payload.valor === 1 : existing.data?.habilitado ?? false,
      causas_inhabilitacion: '',
      medicos_generales: null,
      medico_disponible: doctorAvailability ? payload.valor === 1 : existing.data?.medico_disponible ?? false
    };
    const result = existing.data
      ? await client.from('respuestas').update(row).eq('id', existing.data.id)
      : await client.from('respuestas').insert(row);
    if (result.error) throw result.error;
    return timestamp;
  }

  const isOfficeConfiguration = payload.pregunta === OFFICE_ENABLED_QUESTION
    || payload.pregunta === GENERAL_DOCTOR_COUNT_QUESTION
    || payload.pregunta === DISABLED_CAUSE_CONFIRMATION_QUESTION
    || Boolean(cause);

  if (isOfficeConfiguration) {
    const timestamp = new Date().toISOString();
    const existing = await client.from('respuestas').select('*')
      .eq('clues_imb', normalizedClues)
      .eq('tipo_registro', 'consultorio')
      .eq('consultorio', payload.numeroConsultorio)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (payload.pregunta === DISABLED_CAUSE_CONFIRMATION_QUESTION) return timestamp;

    const selectedCauses = new Set<string>(parseStoredCauses(existing.data?.causas_inhabilitacion));
    if (cause) {
      if (payload.valor === 1) selectedCauses.add(cause.label);
      else selectedCauses.delete(cause.label);
    }

    const enabled = payload.pregunta === OFFICE_ENABLED_QUESTION
      ? payload.valor === 1
      : existing.data?.habilitado ?? null;
    const row = {
      fecha_registro: timestamp,
      tipo_registro: 'consultorio',
      entidad: payload.entidad,
      usuario_nombre: payload.usuarioNombre,
      usuario_email: payload.usuarioEmail,
      clues_imb: normalizedClues,
      nombre_de_la_unidad: payload.nombreUnidad,
      consultorio: payload.numeroConsultorio,
      pregunta: null,
      valor: null,
      turno: enabled === false ? null : existing.data?.turno || payload.turno || null,
      habilitado: enabled,
      causas_inhabilitacion: enabled === true ? '' : [...selectedCauses].join(', '),
      medicos_generales: enabled === false
        ? null
        : payload.pregunta === GENERAL_DOCTOR_COUNT_QUESTION ? payload.valor : existing.data?.medicos_generales ?? null
    };
    const result = existing.data
      ? await client.from('respuestas').update(row).eq('id', existing.data.id)
      : await client.from('respuestas').insert(row);
    if (result.error) throw result.error;
    if (payload.pregunta === OFFICE_ENABLED_QUESTION && !enabled) {
      const { error } = await client.rpc('eliminar_datos_consultorio_deshabilitado', {
        p_clues: normalizedClues,
        p_consultorio: payload.numeroConsultorio
      });
      if (error) throw error;
    }
    return timestamp;
  }

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
  tipo_registro: 'unidad' | 'respuesta' | 'consultorio' | 'horario';
  entidad: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  clues_imb: string;
  nombre_de_la_unidad: string | null;
  internet: string | null;
  consultorios_habilitados: number | null;
  consultorios_inhabilitados: number | null;
  total_consultorios_medicina_general: number | null;
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
    const { error } = await supabase.from('respuestas').select('id').limit(1);
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
  const questionAliases: Record<string, string> = {
    'Cubeta de acero inoxidable / Porta cubeta rodable con protector de hule': 'Cubeta de acero inoxidable con porta cubeta rodable con protector de hule',
    'Refrigerador para conservación y manejo de biológicos': 'Refrigerador para vacunas',
    'Congelador para conservación y manejo de biológicos': 'Congelador para paquetes fríos'
  };
  const normalizeQuestionName = (question: string) => questionAliases[question] || question;

  if (supabase) {
    const normalizedClues = clues.trim().toUpperCase();
    const responseResult = await supabase.from('respuestas').select('*').eq('clues_imb', normalizedClues);
    if (responseResult.error) throw responseResult.error;

    const answers: Record<string, QuestionAnswer> = {};
    const turns: UnitGeneralData['turns'] = {};
    const rows = responseResult.data || [];
    const config = rows.find((row) => row.tipo_registro === 'unidad');
    const legacyOfficeCount = rows.find((row) => row.tipo_registro === 'respuesta' && row.pregunta === 'consultorios');

    rows.filter((row) => row.tipo_registro === 'consultorio').forEach((office) => {
      const officeNumber = Number(office.consultorio);
      const updatedAt = office.fecha_registro || new Date().toISOString();
      if (office.habilitado !== null) {
        answers[`${officeNumber}__${OFFICE_ENABLED_QUESTION}`] = {
          clues: normalizedClues,
          officeNumber,
          question: OFFICE_ENABLED_QUESTION,
          value: office.habilitado ? 1 : 0,
          status: 'saved_cloud',
          turn: office.turno || '',
          updatedAt
        };
      }
      if (office.turno) turns[officeNumber] = office.turno;
      if (office.medicos_generales !== null) {
        answers[`${officeNumber}__${GENERAL_DOCTOR_COUNT_QUESTION}`] = {
          clues: normalizedClues,
          officeNumber,
          question: GENERAL_DOCTOR_COUNT_QUESTION,
          value: Number(office.medicos_generales),
          status: 'saved_cloud',
          turn: office.turno || '',
          updatedAt
        };
      }
      const selectedCauses = new Set<string>(parseStoredCauses(office.causas_inhabilitacion));
      DISABLED_OFFICE_CAUSES.forEach((cause) => {
        if (!selectedCauses.has(cause.label)) return;
        answers[`${officeNumber}__${cause.question}`] = {
          clues: normalizedClues,
          officeNumber,
          question: cause.question,
          value: 1,
          status: 'saved_cloud',
          turn: office.turno || '',
          updatedAt
        };
      });
      if (selectedCauses.size > 0) {
        answers[`${officeNumber}__${DISABLED_CAUSE_CONFIRMATION_QUESTION}`] = {
          clues: normalizedClues,
          officeNumber,
          question: DISABLED_CAUSE_CONFIRMATION_QUESTION,
          value: 1,
          status: 'saved_cloud',
          turn: office.turno || '',
          updatedAt
        };
      }
      parseStoredSchedules(office.horarios).forEach((schedule) => {
        const scheduleQuestion = getOfficeScheduleQuestion(schedule.turno, schedule.dia);
        const doctorQuestion = getDoctorAvailabilityQuestion(schedule.turno, schedule.dia);
        answers[`${officeNumber}__${scheduleQuestion}`] = {
          clues: normalizedClues, officeNumber, question: scheduleQuestion, value: 1,
          status: 'saved_cloud', turn: schedule.turno, updatedAt
        };
        answers[`${officeNumber}__${doctorQuestion}`] = {
          clues: normalizedClues, officeNumber, question: doctorQuestion,
          value: schedule.existe_medico ? 1 : 0,
          status: 'saved_cloud', turn: schedule.turno, updatedAt
        };
      });
    });

    rows.filter((row) => row.tipo_registro === 'horario' && row.habilitado).forEach((scheduleRow) => {
      const officeNumber = Number(scheduleRow.consultorio);
      const match = String(scheduleRow.turno || '').match(/^(Matutino|Vespertino) - (.+)$/);
      if (!match) return;
      const operationalTurn = match[1] as OperationalTurn;
      const day = match[2];
      const updatedAt = scheduleRow.fecha_registro || new Date().toISOString();
      const scheduleQuestion = getOfficeScheduleQuestion(operationalTurn, day);
      const doctorQuestion = getDoctorAvailabilityQuestion(operationalTurn, day);
      answers[`${officeNumber}__${scheduleQuestion}`] = {
        clues: normalizedClues, officeNumber, question: scheduleQuestion, value: 1,
        status: 'saved_cloud', turn: operationalTurn, updatedAt
      };
      answers[`${officeNumber}__${doctorQuestion}`] = {
        clues: normalizedClues, officeNumber, question: doctorQuestion,
        value: scheduleRow.medico_disponible ? 1 : 0,
        status: 'saved_cloud', turn: operationalTurn, updatedAt
      };
    });

    rows
      .filter((row) => row.tipo_registro === 'respuesta' && row.pregunta !== 'consultorios' && row.valor !== null)
      .forEach((row) => {
        const officeNumber = Number(row.consultorio);
        const question = normalizeQuestionName(String(row.pregunta));
        answers[`${officeNumber}__${question}`] = {
          clues: normalizedClues,
          officeNumber,
          question,
          value: row.valor === null ? null : Number(row.valor),
          status: 'saved_cloud',
          turn: '',
          updatedAt: row.fecha_registro || new Date().toISOString(),
          version: 1
        };
      });

    const general = config ? {
      clues: normalizedClues,
      entidad: config.entidad || '',
      nombreUnidad: config.nombre_de_la_unidad || '',
      usuarioNombre: config.usuario_nombre || '',
      usuarioEmail: config.usuario_email || '',
      hasInternet: config.internet || 'PENDIENTE',
      hasTemporarilyClosedOffices: config.consultorios_inhabilitados === null
        ? 'PENDIENTE'
        : Number(config.consultorios_inhabilitados) > 0 ? 'SI' : 'NO',
      enabledOffices: config.consultorios_habilitados === null ? null : Number(config.consultorios_habilitados),
      unoperatedOffices: config.consultorios_inhabilitados === null ? null : Number(config.consultorios_inhabilitados),
      totalGeneralOffices: config.total_consultorios_medicina_general === null
        ? null
        : Number(config.total_consultorios_medicina_general),
      configuredOffices: config.consultorios === null || config.consultorios === undefined
        ? legacyOfficeCount ? Number(legacyOfficeCount.consultorio) : null
        : Number(config.consultorios),
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
        Object.entries(questions as Record<string, any>).forEach(([storedQuestion, cell]) => {
          const numericOffice = Number(officeNumber);
          const question = normalizeQuestionName(storedQuestion);
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
        const question = normalizeQuestionName(r.pregunta || r.question);
        const k = `${r.numeroConsultorio || r.officeNumber}__${question}`;
        answers[k] = {
          clues: r.clues,
          officeNumber: r.numeroConsultorio || r.officeNumber,
          question,
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
  valor: number;
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
      usuario_email: generalData.usuarioEmail || '',
      clues_imb: normalizedClues,
      nombre_de_la_unidad: generalData.nombreUnidad || '',
      internet: generalData.hasInternet,
      consultorios_habilitados: generalData.enabledOffices,
      consultorios_inhabilitados: generalData.unoperatedOffices,
      total_consultorios_medicina_general: generalData.totalGeneralOffices,
      consultorios: generalData.configuredOffices,
      consultorio: null,
      pregunta: null,
      valor: null,
      turno: null
    };
    const existingConfig = await client.from('respuestas').select('id').eq('clues_imb', normalizedClues).eq('tipo_registro', 'unidad').maybeSingle();
    if (existingConfig.error) throw existingConfig.error;
    const configResult = existingConfig.data
      ? await client.from('respuestas').update(configRow).eq('id', existingConfig.data.id)
      : await client.from('respuestas').insert(configRow);
    if (configResult.error) throw configResult.error;

    for (const [officeNumber, turn] of Object.entries(generalData.turns)) {
      if (!turn) continue;
      const numericOffice = Number(officeNumber);
      const existingOffice = await client.from('respuestas').select('*')
        .eq('clues_imb', normalizedClues)
        .eq('tipo_registro', 'consultorio')
        .eq('consultorio', numericOffice)
        .maybeSingle();
      if (existingOffice.error) throw existingOffice.error;
      const officeRow = {
        fecha_registro: timestamp,
        tipo_registro: 'consultorio',
        entidad: generalData.entidad || '',
        usuario_nombre: generalData.usuarioNombre || '',
        usuario_email: existingOffice.data?.usuario_email || null,
        clues_imb: normalizedClues,
        nombre_de_la_unidad: generalData.nombreUnidad || existingOffice.data?.nombre_de_la_unidad || '',
        consultorio: numericOffice,
        pregunta: null,
        valor: null,
        turno: turn,
        habilitado: existingOffice.data?.habilitado ?? null,
        causas_inhabilitacion: typeof existingOffice.data?.causas_inhabilitacion === 'string'
          ? existingOffice.data.causas_inhabilitacion
          : parseStoredCauses(existingOffice.data?.causas_inhabilitacion).join(', '),
        medicos_generales: existingOffice.data?.medicos_generales ?? null
      };
      const turnResult = existingOffice.data
        ? await client.from('respuestas').update(officeRow).eq('id', existingOffice.data.id)
        : await client.from('respuestas').insert(officeRow);
      if (turnResult.error) throw turnResult.error;

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

export async function deleteOfficeTurnSchedules(
  clues: string,
  officeNumber: number,
  turn: OperationalTurn
): Promise<ApiResponse<{ deletedCount: number }>> {
  if (supabase) {
    const { data, error } = await supabase.rpc('eliminar_horarios_turno', {
      p_clues: clues.trim().toUpperCase(),
      p_consultorio: officeNumber,
      p_turno: turn
    });
    if (error) throw error;
    return { success: true, data: { deletedCount: Number(data) || 0 } };
  }

  const res = await fetch(
    `${API_BASE}/unidades/${encodeURIComponent(clues)}/consultorios/${officeNumber}/horarios/${encodeURIComponent(turn)}/`,
    { method: 'DELETE' }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'No fue posible borrar los horarios del turno');
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
      } else if (item.action === 'delete_turn_schedules') {
        await deleteOfficeTurnSchedules(
          item.clues,
          Number(item.payload.officeNumber),
          item.payload.turn as OperationalTurn
        );
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

