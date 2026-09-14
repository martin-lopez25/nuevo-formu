import { createClient } from '@supabase/supabase-js';
import units from '../../src/data/units.json';
import questions from '../../src/data/questions.json';
import type { CluesGeoItem, DataRow, TablasFormulario } from './types';

interface ExpectedUnit {
  clues: string;
  name: string;
  entity: string;
}

interface SupabaseRow {
  fecha_registro: string | null;
  tipo_registro: 'unidad' | 'respuesta' | 'consultorio' | 'horario';
  entidad: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  clues_imb: string | null;
  nombre_de_la_unidad: string | null;
  internet: string | null;
  consultorios: number | null;
  consultorio: number | null;
  pregunta: string | null;
  valor: number | null;
  turno: string | null;
  turno_consultorio: string | null;
  habilitado: boolean | null;
  causas_inhabilitacion: string | null;
  medicos_generales: number | null;
  catalogo_version: number | null;
  [column: string]: unknown;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
const EQUIPMENT_QUESTION_COUNT = questions.length;

function normalize(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function questionKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function fetchLiveAdvanceTables(): Promise<{
  baseAn: DataRow[];
  resultado: DataRow[];
  resumen: DataRow[];
  resumenEntidad: DataRow[];
  tablaAvance: DataRow[];
  tablaEntidades: DataRow[];
  tablaUnidadesAvance: DataRow[];
  faltantes: DataRow[];
  faltantesPorEstados: DataRow[];
  tablaFaltantesPorEstados: DataRow[];
  scriptLastRunAt?: string;
}> {
  if (!supabase) throw new Error('Supabase no está configurado para calcular el avance');

  const expectedUnits = units as ExpectedUnit[];
  const expectedByClues = new Map<string, ExpectedUnit>(
    expectedUnits.map((unit) => [normalize(unit.clues), {
      clues: normalize(unit.clues),
      name: String(unit.name ?? '').trim(),
      entity: normalize(unit.entity),
    }]),
  );
  const rows: SupabaseRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('respuestas')
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`No fue posible consultar las respuestas de Supabase: ${error.message}`);
    const page = (data ?? []) as SupabaseRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  const configByClues = new Map<string, SupabaseRow>();
  const officeByKey = new Map<string, SupabaseRow>();
  const responsesByClues = new Map<string, {
    responded: number;
    answeredWithValue: number;
    maxOffice: number | null;
  }>();
  const responseRows: SupabaseRow[] = [];

  const registerResponse = (row: SupabaseRow) => {
    const clues = normalize(row.clues_imb);
    responseRows.push(row);
    const current = responsesByClues.get(clues) ?? {
      responded: 0,
      answeredWithValue: 0,
      maxOffice: null,
    };
    current.responded += 1;
    if (row.valor !== null) current.answeredWithValue += 1;
    if (row.consultorio !== null && Number.isFinite(Number(row.consultorio))) {
      const office = Number(row.consultorio);
      current.maxOffice = current.maxOffice === null ? office : Math.max(current.maxOffice, office);
    }
    responsesByClues.set(clues, current);
  };

  for (const row of rows) {
    const clues = normalize(row.clues_imb);
    if (!clues || !expectedByClues.has(clues)) continue;
    if (row.tipo_registro === 'unidad') {
      configByClues.set(clues, row);
      continue;
    }
    if (row.tipo_registro === 'consultorio' && row.consultorio !== null) {
      officeByKey.set(`${clues}::${row.consultorio}`, row);
      for (const question of questions) {
        const value = row[`p_${question.id}`];
        if (value === null || value === undefined) continue;
        registerResponse({ ...row, pregunta: question.name, valor: Number(value) });
      }
      continue;
    }
    if (row.tipo_registro !== 'respuesta') continue;
    registerResponse(row);
  }

  const questionColumns = questions.map((question) => `${questionKey(question.name)}_consultorio`);
  const questionColumnByName = new Map(
    questions.map((question) => [normalize(question.name), `${questionKey(question.name)}_consultorio`]),
  );
  const resultByOffice = new Map<string, DataRow>();

  const ensureOfficeResult = (clues: string, office: number, row: SupabaseRow): DataRow | null => {
    const unit = expectedByClues.get(clues);
    if (!unit) return null;
    const key = `${clues}::${office}`;
    const config = configByClues.get(clues);
    const officeConfig = officeByKey.get(key);
    const result: DataRow = resultByOffice.get(key) ?? {
      entidad: unit.entity,
      clues_imb: clues,
      nombre_de_la_unidad: unit.name,
      internet: config?.internet ?? null,
      consultorios: config?.consultorios ?? null,
      consultorio: office,
      turno_consultorio: officeConfig?.turno_consultorio ?? null,
      turno: officeConfig?.turno ?? null,
      habilitado: officeConfig?.habilitado ?? null,
      causas_inhabilitacion: officeConfig?.causas_inhabilitacion ?? null,
      medicos_generales: officeConfig?.medicos_generales ?? null,
    };
    resultByOffice.set(key, result);
    return result;
  };

  for (const [clues, config] of configByClues) {
    const officeCount = Number(config.consultorios ?? 0);
    for (let office = 1; office <= officeCount; office += 1) {
      ensureOfficeResult(clues, office, config);
    }
  }

  for (const row of responseRows) {
    const clues = normalize(row.clues_imb);
    if (row.consultorio === null || row.consultorio <= 0) continue;
    const result = ensureOfficeResult(clues, row.consultorio, row);
    if (!result) continue;
    const column = questionColumnByName.get(normalize(row.pregunta))
      ?? `${questionKey(row.pregunta)}_consultorio`;
    result[column] = row.valor;
    if (row.turno_consultorio) result.turno_consultorio = row.turno_consultorio;
  }

  const resultado = [...resultByOffice.values()].map((row) => {
    const complete = { ...row };
    for (const column of questionColumns) {
      if (!(column in complete)) complete[column] = null;
    }
    return complete;
  });

  const resumen = [...responsesByClues.entries()].map(([clues, response]) => {
    const unit = expectedByClues.get(clues);
    const config = configByClues.get(clues);
    return {
      clues_imb: clues,
      entidad: unit?.entity ?? normalize(config?.entidad),
      nombre_de_la_unidad: unit?.name ?? String(config?.nombre_de_la_unidad ?? ''),
      internet: config?.internet ?? null,
      consultorios: config?.consultorios ?? null,
      consultorio: config?.consultorios ?? response.maxOffice,
    };
  });

  const unitGeneralColumns = new Set([
    'internet',
    'consultorios',
    'habilitado',
    'causas_inhabilitacion',
    'medicos_generales',
    'turno',
  ]);
  const resumenEntidadMap = new Map<string, DataRow>();
  for (const row of resultado) {
    const entidad = String(row.entidad ?? 'Sin entidad');
    const aggregate = resumenEntidadMap.get(entidad) ?? Object.fromEntries([
      ['entidad', entidad],
      ['consultorio', 0],
      ...questionColumns.map((column) => [column, null]),
    ]);
    for (const [column, value] of Object.entries(row)) {
      if (column === 'entidad' || column === 'clues_imb' || column === 'nombre_de_la_unidad' || column === 'turno_consultorio' || column === 'consultorio' || unitGeneralColumns.has(column)) continue;
      if (typeof value === 'number') aggregate[column] = Number(aggregate[column] ?? 0) + value;
    }
    aggregate.consultorio = Number(aggregate.consultorio ?? 0) + 1;
    resumenEntidadMap.set(entidad, aggregate);
  }

  const resumenEntidad = [...resumenEntidadMap.values()];

  const faltantes = resultado.flatMap((row) => {
    const missing = questionColumns
      .filter((column) => row[column] === null || row[column] === undefined)
      .map((column) => column.replace(/_consultorio$/, ''));
    if (!missing.length) return [];
    return [{
      entidad: row.entidad,
      clues_imb: row.clues_imb,
      nombre_de_la_unidad: row.nombre_de_la_unidad,
      consultorio: row.consultorio,
      n_faltantes: missing.length,
      preguntas_faltantes: missing.join(', '),
    }];
  });

  const totals = new Map<string, { total: number; answered: number }>();
  const tablaUnidadesAvance: DataRow[] = [];
  const entityCompletion = new Map<string, {
    consultorios: number;
    respondidas: number;
    respondidasConValor: number;
    esperadas: number;
    unidades: number;
    unidadesCero: number;
  }>();

  for (const [clues, unit] of expectedByClues) {
    const response = responsesByClues.get(clues);
    const config = configByClues.get(clues);
    const responded = response?.responded ?? 0;
    const configuredOffices = config?.consultorios == null ? null : Number(config.consultorios);
    const officeCount = configuredOffices ?? response?.maxOffice ?? null;
    const expected = officeCount === null ? 0 : officeCount * EQUIPMENT_QUESTION_COUNT;
    const percentage = officeCount === 0
      ? 100
      : (expected > 0 ? Math.min(100, +((responded / expected) * 100).toFixed(1)) : 0);

    tablaUnidadesAvance.push({
      clues,
      entidad: unit.entity,
      nombre_de_la_unidad: unit.name,
      consultorios: officeCount,
      respondidas: responded,
      esperadas: expected,
      porcentaje: percentage,
    });

    const completion = entityCompletion.get(unit.entity) ?? {
      consultorios: 0,
      respondidas: 0,
      respondidasConValor: 0,
      esperadas: 0,
      unidades: 0,
      unidadesCero: 0,
    };
    completion.consultorios += officeCount ?? 0;
    completion.respondidas += responded;
    completion.respondidasConValor += response?.answeredWithValue ?? 0;
    completion.esperadas += expected;
    completion.unidades += 1;
    if (officeCount === 0) completion.unidadesCero += 1;
    entityCompletion.set(unit.entity, completion);

    const entity = unit.entity;
    const current = totals.get(entity) ?? { total: 0, answered: 0 };
    current.total += 1;
    if (response || configuredOffices === 0) current.answered += 1;
    totals.set(entity, current);
  }

  const tablaAvance = [...totals.entries()]
    .map(([entidad, counts]) => ({
      entidad,
      total_unidades: counts.total,
      unidades_respondieron: counts.answered,
      porcentaje: counts.total > 0 ? +((counts.answered / counts.total) * 100).toFixed(1) : 0,
    }))
    .sort((first, second) => Number(second.porcentaje) - Number(first.porcentaje));

  const tablaEntidades = [...entityCompletion.entries()]
    .map(([entidad, counts]) => {
      const allUnitsExplicitlyZero = counts.unidades > 0 && counts.unidadesCero === counts.unidades;
      const percentage = counts.esperadas > 0
        ? Math.min(100, +((counts.respondidas / counts.esperadas) * 100).toFixed(1))
        : (allUnitsExplicitlyZero ? 100 : 0);

      return {
        entidad,
        consultorios: counts.consultorios,
        respondidas: counts.respondidas,
        respondidas_con_valor: counts.respondidasConValor,
        esperadas: counts.esperadas,
        unidades: counts.unidades,
        unidades_cero_explicit: counts.unidadesCero,
        porcentaje: percentage,
        porcentaje_con_valor: counts.esperadas > 0
          ? Math.min(100, +((counts.respondidasConValor / counts.esperadas) * 100).toFixed(1))
          : (allUnitsExplicitlyZero ? 100 : 0),
      };
    })
    .sort((first, second) => Number(second.porcentaje) - Number(first.porcentaje));

  tablaUnidadesAvance.sort((first, second) => Number(second.porcentaje) - Number(first.porcentaje));

  const faltantesPorEstados = [...expectedByClues.entries()]
    .filter(([clues]) => !responsesByClues.has(clues) && configByClues.get(clues)?.consultorios !== 0)
    .map(([clues, unit]) => ({
      entidad: unit.entity,
      clues_imb: clues,
      nombre_de_la_unidad: unit.name,
    }))
    .sort((first, second) => String(first.entidad).localeCompare(String(second.entidad)));

  const missingByEntity = new Map<string, number>();
  for (const row of faltantesPorEstados) {
    const entidad = String(row.entidad);
    missingByEntity.set(entidad, (missingByEntity.get(entidad) ?? 0) + 1);
  }
  const tablaFaltantesPorEstados = [...missingByEntity.entries()]
    .map(([entidad, cluesFaltantes]) => ({ entidad, clues_faltantes: cluesFaltantes }))
    .sort((first, second) => second.clues_faltantes - first.clues_faltantes);

  const scriptLastRunAt = rows
    .map((row) => row.fecha_registro)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return {
    baseAn: rows as unknown as DataRow[],
    resultado,
    resumen,
    resumenEntidad,
    tablaAvance,
    tablaEntidades,
    tablaUnidadesAvance,
    faltantes,
    faltantesPorEstados,
    tablaFaltantesPorEstados,
    scriptLastRunAt,
  };
}

async function fetchJson<T>(filename: string): Promise<T | null> {
  const ts = Date.now();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${filename}?_cb=${ts}`);
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

async function fetchCluesGeo(): Promise<CluesGeoItem[]> {
  const payload = await fetchJson<unknown[]>('clues_geo.json');
  if (!Array.isArray(payload)) return [];
  return payload.filter(
    (r) => r && typeof r === 'object' && typeof (r as Record<string, unknown>).lat === 'number' && typeof (r as Record<string, unknown>).lng === 'number' && (r as Record<string, unknown>).clues_imb,
  ) as CluesGeoItem[];
}

export async function cargarTablasFormulario(): Promise<{ tablas: TablasFormulario; fetchedAt: Date }> {
  const [cluesGeo, liveTables] = await Promise.all([
    fetchCluesGeo(),
    fetchLiveAdvanceTables(),
  ]);

  const expectedUnits = units as ExpectedUnit[];
  const expectedEntities = new Set(expectedUnits.map((unit) => normalize(unit.entity)));

  const tablas: TablasFormulario = {
    baseClues: expectedUnits.map((unit) => normalize(unit.clues)),
    baseMeta: {
      cluesTotal: expectedUnits.length,
      entidadesEsperadas: expectedEntities.size,
      scriptLastRunAt: liveTables.scriptLastRunAt,
    },
    baseAn: liveTables.baseAn,
    resultado: liveTables.resultado,
    resumen: liveTables.resumen,
    resumenEntidad: liveTables.resumenEntidad,
    tablaAvance: liveTables.tablaAvance,
    tablaEntidades: liveTables.tablaEntidades,
    tablaUnidadesAvance: liveTables.tablaUnidadesAvance,
    faltantesPorEstados: liveTables.faltantesPorEstados,
    tablaFaltantesPorEstados: liveTables.tablaFaltantesPorEstados,
    cluesGeo,
    faltantes: liveTables.faltantes,
  };

  return { tablas, fetchedAt: new Date() };
}
