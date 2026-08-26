import { MexicanEntity, MedicalUnit, QuestionAnswer, EquipmentItem, SyncQueueItem, UnitGeneralData } from '../types.ts';

const API_BASE = '/api';
export const IS_STATIC_DEPLOYMENT = typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  serverTimestamp?: string;
  version?: number;
}

export async function checkServerHealth(): Promise<boolean> {
  if (IS_STATIC_DEPLOYMENT) return false;

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
  if (IS_STATIC_DEPLOYMENT) {
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
  if (IS_STATIC_DEPLOYMENT) {
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
  if (IS_STATIC_DEPLOYMENT) {
    const { INITIAL_MEDICAL_UNITS, getUnitsForEntity } = await import('../data/mexicoEntities.ts');
    const all = entityName ? getUnitsForEntity(entityName) : INITIAL_MEDICAL_UNITS;
    const normalizedQuery = query.trim().toLowerCase();
    return all.filter(
      (unit) =>
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
  if (IS_STATIC_DEPLOYMENT) return { answers: {} };

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
  const res = await fetch(`${API_BASE}/sincronizar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  return res.json();
}

