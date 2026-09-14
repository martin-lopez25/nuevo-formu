import { useEffect, useMemo, useState } from 'react';
import { Database, Building2, Layers3, AlertTriangle, LayoutGrid, Gauge, FileSearch } from 'lucide-react';
import { Header } from './components/Header';
import { AvanceCharts, AvanceSummaryCards, StatCards } from './components/Charts';
import { DataTable } from './components/DataTable';
import { cargarTablasFormulario } from './data';
import questions from '../../src/data/questions.json';
import type { DashboardStats, DataRow, EntidadChart, InternetPieItem, TopFaltanteChart, CluesGeoItem } from './types';

type DataTabKey = 'cruda' | 'clues' | 'estado' | 'faltantes' | 'tabla-avance' | 'tabla-entidades' | 'tabla-unidades' | 'faltantes-estados' | 'tabla-faltantes-estados';
type MainTabKey = 'infraestructura' | 'avance' | 'pendientes';

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeKey(value: unknown): string {
  return toText(value).toUpperCase();
}

function questionColumnKey(value: string): string {
  return `${value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}_consultorio`;
}

const QUESTION_COLUMN_LABELS = new Map(
  (questions as Array<{ name: string }>).map((question) => [questionColumnKey(question.name), question.name]),
);

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'boolean') return value === false;
  if (typeof value === 'number') return value <= 0;

  const text = toText(value).toLowerCase();
  return text === '' || text === 'false' || text === 'no' || text === '0' || text === 'nan';
}

function isZeroValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '' || value === false) return true;
  if (typeof value === 'number') return value <= 0;
  const text = toText(value).toLowerCase();
  return text === '' || text === '0' || text === '0.0' || text === 'false' || text === 'no' || text === 'nan';
}

function excelSerialToDate(serial: number): Date {
  // Excel epoch: Dec 30, 1899 = day 0; JS epoch: Jan 1, 1970 = day 25569
  return new Date((serial - 25569) * 86400 * 1000);
}

function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (value > 25569 && value < 73050) {
      const d = excelSerialToDate(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  const text = toText(value);
  if (!text) return null;

  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  const mxFormat = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!mxFormat) return null;

  const day = Number(mxFormat[1]);
  const month = Number(mxFormat[2]);
  const year = Number(mxFormat[3]);
  const hour = Number(mxFormat[4] ?? 0);
  const minute = Number(mxFormat[5] ?? 0);
  const second = Number(mxFormat[6] ?? 0);

  const parsed = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferDataUpdatedAt(rows: DataRow[]): Date | null {
  let latest: Date | null = null;

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!/fecha/i.test(key)) continue;
      const parsed = parseDateValue(value);
      if (!parsed) continue;

      if (!latest || parsed.getTime() > latest.getTime()) {
        latest = parsed;
      }
    }
  }

  return latest;
}

function formatLastUpdateLabel(date: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour24 = date.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  const ampm = hour24 >= 12 ? 'p.m.' : 'a.m.';
  return `${day} ${month} ${year}, ${String(hour12).padStart(2, '0')}:${minute} ${ampm}`;
}

function formatCellValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'number') {
    // Detecta serial de fecha Excel en columnas cuyo nombre contiene 'fecha'
    if (key && /fecha/i.test(key) && value > 25569 && value < 73050) {
      const d = excelSerialToDate(value);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getDate()}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  const text = String(value).trim();
  if (text.toLowerCase() === 'true') return 'Si';
  if (text.toLowerCase() === 'false') return 'No';
  return text;
}

export default function App() {
  const [mainTab, setMainTab] = useState<MainTabKey>('infraestructura');
  const [dataTab, setDataTab] = useState<DataTabKey>('clues');
  const [crudaUnlocked, setCrudaUnlocked] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseAn, setBaseAn] = useState<DataRow[]>([]);
  const [baseClues, setBaseClues] = useState<string[]>([]);
  const [baseMeta, setBaseMeta] = useState<{ cluesTotal: number; entidadesEsperadas: number }>({
    cluesTotal: 0,
    entidadesEsperadas: 0,
  });
  const [resultado, setResultado] = useState<DataRow[]>([]);
  const [resumen, setResumen] = useState<DataRow[]>([]);
  const [resumenEntidad, setResumenEntidad] = useState<DataRow[]>([]);
  const [tablaAvance, setTablaAvance] = useState<DataRow[]>([]);
  const [tablaEntidades, setTablaEntidades] = useState<DataRow[]>([]);
  const [tablaUnidadesAvance, setTablaUnidadesAvance] = useState<DataRow[]>([]);
  const [faltantesPorEstados, setFaltantesPorEstados] = useState<DataRow[]>([]);
  const [tablaFaltantesPorEstados, setTablaFaltantesPorEstados] = useState<DataRow[]>([]);
  const [faltantes, setFaltantes] = useState<DataRow[]>([]);
  const [cluesGeo, setCluesGeo] = useState<CluesGeoItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) {
        setIsSyncing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const { tablas, fetchedAt } = await cargarTablasFormulario();
      setBaseClues(tablas.baseClues);
      setBaseMeta(tablas.baseMeta);
      setBaseAn(tablas.baseAn);
      setResultado(tablas.resultado);
      setResumen(tablas.resumen);
      setResumenEntidad(tablas.resumenEntidad);
      setTablaAvance(tablas.tablaAvance);
      setTablaEntidades(tablas.tablaEntidades);
      setTablaUnidadesAvance(tablas.tablaUnidadesAvance);
      setFaltantesPorEstados(tablas.faltantesPorEstados);
      setTablaFaltantesPorEstados(tablas.tablaFaltantesPorEstados);
      setFaltantes(tablas.faltantes);
      setCluesGeo(tablas.cluesGeo);
      setLastUpdate(fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrio un error al cargar datos');
    } finally {
      if (isRefresh) {
        setIsSyncing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => { load(); }, []);

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return 'Sin actualizacion';
    return formatLastUpdateLabel(lastUpdate);
  }, [lastUpdate]);

  const stats = useMemo<DashboardStats>(() => {
    // baseAn ya no se usa — los datos vienen de resumen y resultado directamente
    const cluesCapturadas = new Set<string>();
    const entidadesCapturadas = new Set<string>();
    const cluesConInternet = new Set<string>();

    for (const row of resumen) {
      const clues = toText(row.clues_imb);
      const entidad = toText(row.entidad);
      if (clues) cluesCapturadas.add(clues);
      if (entidad) entidadesCapturadas.add(entidad);

      const internet = toText(row.internet).toLowerCase();
      if (clues && (internet === 'true' || internet === '1' || internet === 'si')) cluesConInternet.add(clues);
    }

    const denominadorClues = baseMeta.cluesTotal > 0 ? baseMeta.cluesTotal : baseClues.length;
    const denominadorEntidades = baseMeta.entidadesEsperadas > 0 ? baseMeta.entidadesEsperadas : entidadesCapturadas.size;

    return {
      registrosBase: resumen.length,
      registrosUnidad: resumen.length,
      registrosRespuesta: resultado.length,
      baseCluesEsperadas: denominadorClues,
      baseEntidadesEsperadas: denominadorEntidades,
      cluesCapturadas: cluesCapturadas.size,
      entidadesCapturadas: entidadesCapturadas.size,
      unidadesInternet: cluesConInternet.size,
      consultoriosTotales: resumen.reduce((s, r) => s + toNumber(r.consultorio), 0),
      pctLlenado: (() => {
        const FIXED = new Set(['entidad', 'clues_imb', 'nombre_de_la_unidad', 'internet', 'consultorios', 'consultorio', 'turno_consultorio', 'habilitado', 'causas_inhabilitacion', 'medicos_generales', 'latitud', 'longitud']);
        let filled = 0, total = 0;
        for (const row of resultado) {
          for (const [key, value] of Object.entries(row)) {
            if (FIXED.has(key)) continue;
            total++;
            if (value !== null && value !== undefined && value !== '') filled++;
          }
        }
        return total > 0 ? +(filled / total * 100).toFixed(1) : 0;
      })(),
    };
  }, [baseClues, baseMeta, resultado, resumen]);

  const topFaltantes = useMemo<TopFaltanteChart[]>(() => {
    const fixedCols = new Set([
      'entidad',
      'clues_imb',
      'nombre_de_la_unidad',
      'internet',
      'consultorios',
      'habilitado',
      'causas_inhabilitacion',
      'medicos_generales',
      'consultorio',
      'turno_consultorio',
      'latitud',
      'longitud',
    ]);

    if (!resultado.length) return [];

    const consultoriosLlenados = resultado.filter((row) => toNumber(row.consultorio) > 0);
    const consultorioId = (row: DataRow) => {
      const clues = toText(row.clues_imb || row.clues) || 'Sin CLUES';
      const consultorio = toText(row.consultorio) || '-';
      return `${clues}::${consultorio}`;
    };

    const countsByItem = new Map<string, Set<string>>();

    for (const row of consultoriosLlenados) {
      const id = consultorioId(row);
      for (const [key, value] of Object.entries(row)) {
        if (fixedCols.has(key)) continue;
        if (isZeroValue(value)) {
          if (!countsByItem.has(key)) countsByItem.set(key, new Set<string>());
          countsByItem.get(key)?.add(id);
        }
      }
    }

    const total = consultoriosLlenados.length;

    return [...countsByItem.entries()]
      .map(([item, consultorios]) => ({
        item: item.replace(/_consultorio(_\d+)?$/i, '').replaceAll('_', ' ').trim(),
        faltantes: consultorios.size,
        pct: total > 0 ? (consultorios.size / total) * 100 : 0,
      }))
      .sort((a, b) => b.faltantes - a.faltantes)
      .slice(0, 20);
  }, [resultado]);

  const internetPie = useMemo<InternetPieItem[]>(() => {
    const conInternet = stats.unidadesInternet;
    // Referente a las unidades capturadas (506), no al total esperado
    const sinInternet = Math.max(0, stats.cluesCapturadas - conInternet);
    return [
      { name: 'Con Internet', value: conInternet },
      { name: 'Sin Internet', value: sinInternet },
    ];
  }, [stats]);

  const porEntidad = useMemo<EntidadChart[]>(() => {
    const completionByEntity = new Map(
      tablaEntidades.map((row) => [normalizeKey(row.entidad), row]),
    );

    return tablaAvance
      .filter((row) => toNumber(row.unidades_respondieron) > 0)
      .map((row) => {
        const entidad = toText(row.entidad) || 'Sin entidad';
        const completion = completionByEntity.get(normalizeKey(entidad));
        return {
          entidad,
          unidades: toNumber(row.unidades_respondieron),
          consultoriosConfigurados: toNumber(completion?.consultorios),
          consultoriosLevantados: toNumber(completion?.consultorios),
          pctLlenado: toNumber(completion?.porcentaje_con_valor),
        };
      })
      .sort((a, b) => b.unidades - a.unidades);
  }, [tablaAvance, tablaEntidades]);

  const liveGlobalPct = useMemo(() => {
    const respondidas = tablaEntidades.reduce(
      (total, row) => total + toNumber(row.respondidas_con_valor),
      0,
    );
    const esperadas = tablaEntidades.reduce(
      (total, row) => total + toNumber(row.esperadas),
      0,
    );
    return esperadas > 0 ? +((respondidas / esperadas) * 100).toFixed(1) : 0;
  }, [tablaEntidades]);

  const tableColumns = (rows: DataRow[], includeFechaRegistro = true) => {
    if (!rows.length) return [];
    return Object.keys(rows[0])
      .filter((key) => includeFechaRegistro || key !== 'fecha_registro')
      .map((key) => ({
      key,
      label: QUESTION_COLUMN_LABELS.get(key) ?? key,
      render: (row: DataRow) => QUESTION_COLUMN_LABELS.has(key) && row[key] == null
        ? ''
        : formatCellValue(row[key], key),
      }));
  };

  const handleLogoClick = () => {
    setLogoClickCount((prev) => {
      const next = prev + 1;
      if (next >= 6) {
        setCrudaUnlocked(true);
        return 0;
      }
      return next;
    });
  };

  const allDataTabs: { key: DataTabKey; label: string; icon: typeof Database; count: number }[] = [
    { key: 'cruda', label: 'Base Cruda', icon: Database, count: baseAn.length },
    { key: 'clues', label: 'Por CLUES', icon: Building2, count: resultado.length },
    { key: 'estado', label: 'Por Estado', icon: Layers3, count: resumenEntidad.length },
    { key: 'faltantes', label: 'Faltantes', icon: AlertTriangle, count: faltantes.length },
    { key: 'tabla-avance', label: 'Tabla avance', icon: Gauge, count: tablaAvance.length },
    { key: 'tabla-entidades', label: 'Tabla entidades', icon: Layers3, count: tablaEntidades.length },
    { key: 'tabla-unidades', label: 'Tabla unidades', icon: Building2, count: tablaUnidadesAvance.length },
    { key: 'faltantes-estados', label: 'Faltantes por estados', icon: AlertTriangle, count: faltantesPorEstados.length },
    { key: 'tabla-faltantes-estados', label: 'Tabla faltantes por estados', icon: AlertTriangle, count: tablaFaltantesPorEstados.length },
  ];

  const dataTabs = allDataTabs.filter(({ key }) => key !== 'cruda' || crudaUnlocked);

  const avanceRows = useMemo<DataRow[]>(() => {
    return porEntidad.map((row) => ({
      entidad: row.entidad,
      unidades: row.unidades,
      consultorios_configurados: row.consultoriosConfigurados,
      consultorios_levantados: row.consultoriosLevantados,
      porcentaje_llenado: row.pctLlenado,
    }));
  }, [porEntidad]);

  const avancePorEntidad = useMemo(() => {
    if (tablaAvance.length > 0) {
      return tablaAvance
        .map((row) => ({
          entidad: toText(row.entidad),
          totalUnidades: toNumber(row.total_unidades),
          unidadesRespondieron: toNumber(row.unidades_respondieron),
          porcentaje: toNumber(row.porcentaje),
        }))
        .filter((row) => row.entidad)
        .sort((a, b) => b.porcentaje - a.porcentaje);
    }

    const esperadasByEntidad = new Map<string, { entidad: string; clues: Set<string> }>();
    const respondidasByEntidad = new Map<string, { entidad: string; clues: Set<string> }>();

    for (const row of baseAn) {
      const tipoRegistro = toText(row.tipo_registro).toLowerCase();
      if (tipoRegistro && tipoRegistro !== 'unidad') continue;

      const entidad = toText(row.entidad);
      const clues = toText(row.clues_imb || row.clues);
      if (!entidad || !clues) continue;

      const key = normalizeKey(entidad);
      if (!esperadasByEntidad.has(key)) {
        esperadasByEntidad.set(key, { entidad, clues: new Set<string>() });
      }
      esperadasByEntidad.get(key)?.clues.add(clues);
    }

    for (const row of resumen) {
      const entidad = toText(row.entidad);
      const clues = toText(row.clues_imb || row.clues);
      if (!entidad || !clues) continue;

      const key = normalizeKey(entidad);
      if (!respondidasByEntidad.has(key)) {
        respondidasByEntidad.set(key, { entidad, clues: new Set<string>() });
      }
      respondidasByEntidad.get(key)?.clues.add(clues);
    }

    const allKeys = new Set<string>([
      ...Array.from(esperadasByEntidad.keys()),
      ...Array.from(respondidasByEntidad.keys()),
    ]);

    return Array.from(allKeys).map((key) => {
      const expected = esperadasByEntidad.get(key);
      const captured = respondidasByEntidad.get(key);
      const totalUnidades = expected?.clues.size ?? 0;
      const unidadesRespondieronRaw = captured?.clues.size ?? 0;
      const unidadesRespondieron = Math.min(unidadesRespondieronRaw, totalUnidades || unidadesRespondieronRaw);

      return {
        entidad: captured?.entidad ?? expected?.entidad ?? key,
        totalUnidades,
        unidadesRespondieron,
        porcentaje: totalUnidades > 0
          ? +((unidadesRespondieron / totalUnidades) * 100).toFixed(1)
          : 0,
      };
    }).sort((a, b) => b.porcentaje - a.porcentaje);
  }, [baseAn, resumen, tablaAvance]);

  const avanceSummary = useMemo(() => {
    const totalEstados = tablaAvance.length;
    const estadosConRegistro = tablaAvance.reduce((sum, row) => sum + (toNumber(row.unidades_respondieron) > 0 ? 1 : 0), 0);
    const totalUnidades = tablaAvance.reduce((sum, row) => sum + toNumber(row.total_unidades), 0);
    const unidadesConRegistro = tablaAvance.reduce((sum, row) => sum + toNumber(row.unidades_respondieron), 0);

    const unidadesCompletas = tablaUnidadesAvance.reduce(
      (sum, row) => sum + (toNumber(row.porcentaje) >= 100 ? 1 : 0),
      0,
    );

    const entidadesAl100 = tablaAvance.reduce(
      (sum, row) => sum + (toNumber(row.porcentaje) >= 100 ? 1 : 0),
      0,
    );

    const pctEntidades = totalEstados > 0 ? (entidadesAl100 / totalEstados) * 100 : 0;
    const pctUnidadesCompletas = totalUnidades > 0 ? (unidadesCompletas / totalUnidades) * 100 : 0;

    return {
      unidadesConRegistro,
      totalUnidades,
      estadosConRegistro,
      totalEstados,
      pctEntidades,
      entidadesAl100,
      unidadesCompletas,
      pctUnidadesCompletas,
    };
  }, [tablaAvance, tablaUnidadesAvance]);

  const pendingSummary = useMemo(() => {
    const cluesSet = new Set<string>();
    const entidadSet = new Set<string>();
    const consultorioSet = new Set<string>();

    for (const row of faltantes) {
      const clues = toText(row.clues || row.clues_imb);
      const entidad = toText(row.entidad);
      const consultorio = `${toText(row.clues || row.clues_imb)}::${toText(row.consultorio)}`;
      if (clues) cluesSet.add(clues);
      if (entidad) entidadSet.add(entidad);
      if (consultorio && consultorio !== '::') consultorioSet.add(consultorio);
    }

    return {
      cluesUnicas: cluesSet.size,
      entidades: entidadSet.size,
      consultorios: consultorioSet.size,
    };
  }, [faltantes]);

  const mainTabs: { key: MainTabKey; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'infraestructura', label: 'Infraestructura y Materiales', icon: LayoutGrid },
    { key: 'avance', label: 'Tablero de avance', icon: Gauge },
    { key: 'pendientes', label: 'Informe de clues pendientes', icon: FileSearch },
  ];

  const headerContent = useMemo(() => {
    if (mainTab === 'avance') {
      return {
        eyebrow: 'Panel de Seguimiento',
        title: 'Tablero de Avance',
        subtitle: 'Visualiza indicadores, gráficas y tablas de avance por entidad y unidad.',
      };
    }

    if (mainTab === 'pendientes') {
      return {
        eyebrow: 'Panel de Seguimiento',
        title: 'Informe de CLUES Pendientes',
        subtitle: 'Consulta el seguimiento de unidades y registros pendientes por completar.',
      };
    }

    return {
      eyebrow: 'Panel Principal',
      title: 'Reporte de Infraestructura y Materiales Hospitalarios',
      subtitle: 'Consulta, visualiza y exporta la base cruda y sus agregados por CLUES y por Estado.',
    };
  }, [mainTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLogoClick={handleLogoClick}
        onSync={() => load(true)}
        isSyncing={isSyncing}
        lastUpdateLabel={lastUpdateLabel}
        eyebrow={headerContent.eyebrow}
        title={headerContent.title}
        subtitle={headerContent.subtitle}
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="card p-10 text-center text-gray-500">Cargando script y construyendo tablas...</div>
        ) : error ? (
          <div className="card border-imss-wine/30 bg-imss-wine/5 p-8 text-imss-wine">Error: {error}</div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {mainTabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setMainTab(key)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                      mainTab === key ? 'tab-active' : 'tab-inactive'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {mainTab === 'infraestructura' && (
                <StatCards stats={stats} internetPie={internetPie} porEntidad={porEntidad} topFaltantes={topFaltantes} cluesGeo={cluesGeo} resultado={resultado} />
              )}

              {mainTab === 'avance' && (
                <div className="space-y-4">
                  <AvanceSummaryCards summary={avanceSummary} />

                  <AvanceCharts
                    porEntidad={porEntidad}
                    globalPct={liveGlobalPct}
                    avancePorEntidad={avancePorEntidad}
                    tablaEntidades={tablaEntidades}
                  />
                </div>
              )}

              {mainTab === 'pendientes' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {dataTabs.map(({ key, label, icon: Icon, count }) => (
                        <button
                          key={key}
                          onClick={() => setDataTab(key)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                            dataTab === key ? 'tab-active' : 'tab-inactive'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                          <span
                            className={`ml-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                              dataTab === key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {dataTab === 'cruda' && (
                      <DataTable<DataRow>
                        exportFileName="base_cruda"
                        exportSheetName="Base Cruda"
                        data={baseAn}
                        columns={tableColumns(baseAn, false)}
                        exportColumns={tableColumns(baseAn, true)}
                      />
                    )}

                    {dataTab === 'clues' && (
                      <DataTable<DataRow>
                        exportFileName="por_clues"
                        exportSheetName="Por CLUES"
                        data={resultado}
                        columns={tableColumns(resultado, false)}
                        exportColumns={tableColumns(resultado, true)}
                      />
                    )}

                    {dataTab === 'estado' && (
                      <DataTable<DataRow>
                        exportFileName="por_estado"
                        exportSheetName="Por Estado"
                        data={resumenEntidad}
                        columns={tableColumns(resumenEntidad, false)}
                        exportColumns={tableColumns(resumenEntidad, true)}
                      />
                    )}

                    {dataTab === 'faltantes' && (
                      <DataTable<DataRow>
                        exportFileName="faltantes"
                        exportSheetName="Faltantes"
                        data={faltantes}
                        columns={tableColumns(faltantes, false)}
                        exportColumns={tableColumns(faltantes, true)}
                      />
                    )}

                    {dataTab === 'tabla-avance' && (
                      <DataTable<DataRow> exportFileName="tabla_avance" exportSheetName="Tabla avance" data={tablaAvance} columns={tableColumns(tablaAvance, false)} exportColumns={tableColumns(tablaAvance, true)} />
                    )}

                    {dataTab === 'tabla-entidades' && (
                      <DataTable<DataRow> exportFileName="tabla_entidades" exportSheetName="Tabla entidades" data={tablaEntidades} columns={tableColumns(tablaEntidades, false)} exportColumns={tableColumns(tablaEntidades, true)} />
                    )}

                    {dataTab === 'tabla-unidades' && (
                      <DataTable<DataRow> exportFileName="tabla_unidades" exportSheetName="Tabla unidades" data={tablaUnidadesAvance} columns={tableColumns(tablaUnidadesAvance, false)} exportColumns={tableColumns(tablaUnidadesAvance, true)} />
                    )}

                    {dataTab === 'faltantes-estados' && (
                      <DataTable<DataRow> exportFileName="faltantes_por_estados" exportSheetName="Faltantes por estados" data={faltantesPorEstados} columns={tableColumns(faltantesPorEstados, false)} exportColumns={tableColumns(faltantesPorEstados, true)} />
                    )}

                    {dataTab === 'tabla-faltantes-estados' && (
                      <DataTable<DataRow> exportFileName="tabla_faltantes_por_estados" exportSheetName="Tabla faltantes estados" data={tablaFaltantesPorEstados} columns={tableColumns(tablaFaltantesPorEstados, false)} exportColumns={tableColumns(tablaFaltantesPorEstados, true)} />
                    )}
                  </div>
              )}
            </div>

          </>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-400">
            IMSS Bienestar · Reporte Interno de Infraestructura de Materiales Hospitalarios · Documento de uso institucional
          </p>
        </div>
      </footer>
    </div>
  );
}
