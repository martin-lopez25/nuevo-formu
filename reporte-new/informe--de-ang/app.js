const data = window.DASHBOARD_DATA || { tables: {}, figures: [] };
const tabsRoot = document.getElementById('tabs');
const tablesRoot = document.getElementById('tables-root');
const graphPanel = document.getElementById('panel-graficas');
const subtitle = document.getElementById('subtitle');
const updatedAtEl = document.getElementById('updated-at');
const unidadesRegistroEl = document.getElementById('value-unidades-registro');
const unidadesRegistroDetailEl = document.getElementById('value-unidades-registro-detail');
const estadosRegistroEl = document.getElementById('value-estados-registro');
const estadosRegistroDetailEl = document.getElementById('value-estados-registro-detail');
const porcentajeEntidadesEl = document.getElementById('value-porcentaje-entidades');
const porcentajeEntidadesDetailEl = document.getElementById('value-porcentaje-entidades-detail');
const unidadesCompletasEl = document.getElementById('value-unidades-completas');
const unidadesCompletasDetailEl = document.getElementById('value-unidades-completas-detail');

const DASHBOARD_COLORWAY = ['#065f46', '#0d9488', '#1d4ed8', '#a57f2c', '#14b8a6', '#2563eb'];
const PCT_FILL_COLORS = ['#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'];
const SEMAFORO = {
  ok: '#0f766e',
  warning: '#d97706',
  alert: '#dc2626',
};

const updateStorePrefix = `dashboard-update:${window.location.pathname}`;

function parseValidDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDataSignature() {
  try {
    return JSON.stringify({
      tables: data.tables || {},
      figures: data.figures || [],
    });
  } catch {
    return '';
  }
}

function readStoredUpdateInfo() {
  try {
    return {
      signature: localStorage.getItem(`${updateStorePrefix}:signature`),
      updatedAt: localStorage.getItem(`${updateStorePrefix}:updatedAt`),
    };
  } catch {
    return { signature: null, updatedAt: null };
  }
}

function writeStoredUpdateInfo(signature, updatedAt) {
  try {
    localStorage.setItem(`${updateStorePrefix}:signature`, signature);
    localStorage.setItem(`${updateStorePrefix}:updatedAt`, updatedAt.toISOString());
  } catch {
    // Ignorar si el navegador bloquea localStorage.
  }
}

function resolveDataUpdatedAt() {
  const signature = getDataSignature();
  const fromData = parseValidDate(
    data.updated_at || data.updatedAt || data.last_updated || data.lastUpdated
  );

  if (fromData) {
    writeStoredUpdateInfo(signature, fromData);
    return fromData;
  }

  const stored = readStoredUpdateInfo();
  if (stored.signature === signature) {
    const storedDate = parseValidDate(stored.updatedAt);
    if (storedDate) return storedDate;
  }

  const now = new Date();
  writeStoredUpdateInfo(signature, now);
  return now;
}

if (data.title) document.title = data.title;
if (subtitle) {
  const nTables = Object.keys(data.tables || {}).length;
  const nCharts = (data.figures || []).length;
  subtitle.textContent = `Visualizacion general con ${nCharts} grafica(s) y ${nTables} tabla(s).`;
}

if (updatedAtEl) {
  const updatedAt = resolveDataUpdatedAt();
  const fechaHora = updatedAt.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  updatedAtEl.textContent = `Actualizado: ${fechaHora}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-MX').format(value || 0);
}

function formatPercent2Digits(value) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded >= 100) return `${rounded}%`;
  return `${String(rounded).padStart(2, '0')}%`;
}

function calculateSummaryMetrics() {
  const avanceRows = data.tables?.tabla_avance?.rows || [];
  const unidadesRows = data.tables?.tabla_unidades?.rows || [];

  const totalEstados = avanceRows.length;
  const estadosConRegistro = avanceRows.reduce((sum, row) => {
    return Number(row.unidades_respondieron || 0) > 0 ? sum + 1 : sum;
  }, 0);
  const totalUnidades = avanceRows.reduce((sum, row) => sum + Number(row.total_unidades || 0), 0);
  const unidadesConRegistro = avanceRows.reduce((sum, row) => sum + Number(row.unidades_respondieron || 0), 0);
  const unidadesCompletasSet = new Set();
  const unidadesCompletasPorEntidad = new Map();

  unidadesRows.forEach(row => {
    if (Number(row.porcentaje || 0) >= 100 && row.clues != null) {
      const clues = String(row.clues);
      unidadesCompletasSet.add(clues);

      const entidad = String(row.entidad || '');
      if (entidad) {
        if (!unidadesCompletasPorEntidad.has(entidad)) {
          unidadesCompletasPorEntidad.set(entidad, new Set());
        }
        unidadesCompletasPorEntidad.get(entidad).add(clues);
      }
    }
  });

  const unidadesCompletas = unidadesCompletasSet.size;
  const entidadesCompletas = avanceRows.reduce((sum, row) => {
    const entidad = String(row.entidad || '');
    const totalUnidadesEntidad = Number(row.total_unidades || 0);
    if (!entidad || totalUnidadesEntidad <= 0) return sum;

    const completasEntidad = unidadesCompletasPorEntidad.get(entidad)?.size || 0;
    return completasEntidad >= totalUnidadesEntidad ? sum + 1 : sum;
  }, 0);
  const porcentajeEntidadesConRegistro = totalEstados
    ? (entidadesCompletas / totalEstados) * 100
    : 0;

  return {
    totalEstados,
    estadosConRegistro,
    entidadesCompletas,
    porcentajeEntidadesConRegistro,
    totalUnidades,
    unidadesConRegistro,
    unidadesCompletas,
  };
}

function renderSummaryMetrics() {
  const metrics = calculateSummaryMetrics();
  const porcentajeConRegistroSobreTotal = metrics.totalUnidades
    ? (metrics.unidadesConRegistro / metrics.totalUnidades) * 100
    : 0;
  const porcentajeCompletas = metrics.totalUnidades
    ? (metrics.unidadesCompletas / metrics.totalUnidades) * 100
    : 0;

  if (unidadesRegistroEl) {
    unidadesRegistroEl.textContent = formatNumber(metrics.unidadesConRegistro);
  }
  if (unidadesRegistroDetailEl) {
    unidadesRegistroDetailEl.textContent = `de ${formatNumber(metrics.totalUnidades)} unidades totales (${formatPercent2Digits(porcentajeConRegistroSobreTotal)})`;
  }
  if (estadosRegistroEl) {
    estadosRegistroEl.textContent = formatNumber(metrics.estadosConRegistro);
  }
  if (estadosRegistroDetailEl) {
    estadosRegistroDetailEl.textContent = `de ${formatNumber(metrics.totalEstados)} estados totales`;
  }
  if (porcentajeEntidadesEl) {
    porcentajeEntidadesEl.textContent = formatPercent2Digits(metrics.porcentajeEntidadesConRegistro);
  }
  if (porcentajeEntidadesDetailEl) {
    porcentajeEntidadesDetailEl.textContent = `${formatNumber(metrics.entidadesCompletas)} de ${formatNumber(metrics.totalEstados)} entidades al 100%`;
  }
  if (unidadesCompletasEl) {
    unidadesCompletasEl.textContent = formatPercent2Digits(porcentajeCompletas);
  }
  if (unidadesCompletasDetailEl) {
    unidadesCompletasDetailEl.textContent = `${formatNumber(metrics.unidadesCompletas)} de ${formatNumber(metrics.totalUnidades)} unidades totales`;
  }
}

function activatePanel(panelId, button) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    panel.classList.remove('panel-enter');
    // Forzar reflow para reiniciar animacion al cambiar pestana.
    void panel.offsetWidth;
    panel.classList.add('panel-enter');
  }
  if (button) button.classList.add('active');

  if (panelId === 'panel-graficas') {
    document.querySelectorAll('.chart-card').forEach((card) => {
      card.classList.remove('card-enter');
      void card.offsetWidth;
      card.classList.add('card-enter');
    });
    setTimeout(() => {
      document.querySelectorAll('.chart').forEach(el => Plotly.Plots.resize(el));
    }, 120);
  }
}

function createTab(label, panelId, isActive = false) {
  const btn = document.createElement('button');
  btn.className = 'tab-btn';
  btn.type = 'button';
  btn.textContent = label;
  btn.dataset.panelId = panelId;
  btn.addEventListener('click', () => activatePanel(panelId, btn));
  tabsRoot.appendChild(btn);
  if (isActive) btn.classList.add('active');
}

window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.data?.type !== 'avance:set-panel') return;
  const panelId = String(event.data.panelId || '');
  const button = Array.from(tabsRoot.querySelectorAll('.tab-btn'))
    .find(item => item.dataset.panelId === panelId);
  if (button && document.getElementById(panelId)) activatePanel(panelId, button);
});

function getRenderableFigures() {
  const seen = new Set();
  return (data.figures || []).filter(item => {
    const figure = item.figure || {};
    const signature = JSON.stringify({
      data: figure.data || [],
      layout: figure.layout || {},
    });
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function buildCluesLookupByEntidad() {
  const rows = data.tables?.faltantes_por_estados?.rows || [];
  const map = new Map();

  rows.forEach(row => {
    const entidad = String(row.entidad || '').trim();
    const clues = String(row.clues_imb || '').trim();
    if (!entidad || !clues) return;

    if (!map.has(entidad)) map.set(entidad, new Set());
    map.get(entidad).add(clues);
  });

  const normalized = new Map();
  map.forEach((cluesSet, entidad) => {
    const cluesList = Array.from(cluesSet).sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
    );
    normalized.set(entidad, cluesList.join('<br>'));
  });

  return normalized;
}

function enrichFigureWithMissingClues(item, figure, cluesLookup) {
  if (!item?.id || !figure?.data?.length) return figure;

  // Deep clone to avoid mutating source payload.
  const updated = JSON.parse(JSON.stringify(figure));
  const firstTrace = updated.data[0];
  if (!firstTrace) return updated;

  if (item.id === 'fig_avance') {
    const entidades = Array.isArray(firstTrace.x) ? firstTrace.x : [];
    const cluesByBar = entidades.map(entidad => {
      return cluesLookup.get(String(entidad || '').trim()) || 'Sin CLUES faltantes';
    });

    firstTrace.customdata = cluesByBar.map(value => [value]);
    firstTrace.hovertemplate = '<b>%{x}</b><br>CLUES faltantes:<br>%{customdata[0]}<extra></extra>';
    updated.layout = {
      ...(updated.layout || {}),
      hovermode: 'x unified',
      hoverdistance: 80,
      clickmode: 'none',
    };
  }

  if (item.id === 'fig_cascada') {
    const entidades = Array.isArray(firstTrace.y) ? firstTrace.y : [];
    const cluesByBar = entidades.map(entidad => {
      return cluesLookup.get(String(entidad || '').trim()) || 'Sin CLUES faltantes';
    });

    firstTrace.customdata = cluesByBar.map(value => [value]);
    firstTrace.hovertemplate = '<b>%{y}</b><br>CLUES faltantes:<br>%{customdata[0]}<extra></extra>';
    updated.layout = {
      ...(updated.layout || {}),
      hovermode: 'y unified',
      hoverdistance: 80,
      clickmode: 'none',
    };
  }

  return updated;
}

function getRankColor(index, total) {
  const t = total > 1 ? index / (total - 1) : 0;
  const colorIdx = Math.min(
    Math.floor(t * (PCT_FILL_COLORS.length - 1)),
    PCT_FILL_COLORS.length - 1
  );
  return PCT_FILL_COLORS[colorIdx];
}

function applyDashboardTheme(figure, figureId = '') {
  const themed = JSON.parse(JSON.stringify(figure || {}));
  const baseLayout = themed.layout || {};
  const avanceRows = data.tables?.tabla_avance?.rows || [];
  const entidadesRows = data.tables?.tabla_entidades?.rows || [];

  const pctByEntidadAvance = new Map(
    avanceRows.map((r) => [String(r.entidad || '').trim().toUpperCase(), Number(r.porcentaje || 0)])
  );
  const pctByEntidadEntidades = new Map(
    entidadesRows.map((r) => [String(r.entidad || '').trim().toUpperCase(), Number(r.porcentaje || 0)])
  );

  themed.layout = {
    ...baseLayout,
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#f8fafc',
    colorway: baseLayout.colorway || DASHBOARD_COLORWAY,
    font: {
      family: 'Manrope, sans-serif',
      color: '#374151',
      size: 12,
      ...(baseLayout.font || {}),
    },
    margin: {
      l: 60,
      r: 20,
      t: 56,
      b: 56,
      ...(baseLayout.margin || {}),
    },
    legend: {
      orientation: 'h',
      y: -0.2,
      x: 0,
      font: { size: 11, color: '#6b7280' },
      ...(baseLayout.legend || {}),
    },
    hoverlabel: {
      bgcolor: '#ffffff',
      bordercolor: '#d1d5db',
      font: { color: '#111827', size: 12, family: 'Manrope, sans-serif' },
      ...(baseLayout.hoverlabel || {}),
    },
  };

  if (themed.layout.title) {
    if (typeof themed.layout.title === 'string') {
      themed.layout.title = {
        text: themed.layout.title,
        font: { size: 16, color: '#111827', family: 'Manrope, sans-serif' },
      };
    } else {
      themed.layout.title = {
        ...themed.layout.title,
        font: {
          size: 16,
          color: '#111827',
          family: 'Manrope, sans-serif',
          ...(themed.layout.title.font || {}),
        },
      };
    }
  }

  const axisTheme = axis => ({
    showgrid: true,
    gridcolor: '#e5e7eb',
    zerolinecolor: '#d1d5db',
    linecolor: '#d1d5db',
    griddash: 'dot',
    gridwidth: 1,
    tickfont: { size: 11, color: '#6b7280' },
    titlefont: { size: 12, color: '#374151' },
    ...(axis || {}),
  });

  themed.layout.xaxis = axisTheme(themed.layout.xaxis);
  themed.layout.yaxis = axisTheme(themed.layout.yaxis);

  const isPctStyleFigure = figureId === 'fig_avance' || figureId === 'fig_cascada';
  if (isPctStyleFigure) {
    themed.layout.bargap = 0.22;
    themed.layout.bargroupgap = 0.08;
    themed.layout.barcornerradius = 4;
  }

  themed.data = (themed.data || []).map((trace, idx) => {
    const next = { ...trace };
    const color = DASHBOARD_COLORWAY[idx % DASHBOARD_COLORWAY.length];

    const parseNumeric = (raw) => {
      if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
      const text = String(raw ?? '').trim();
      if (!text) return NaN;
      const normalized = text.replace(/[^\d.-]/g, '');
      if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
        return NaN;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    const inferValuesForSemaforo = () => {
      const yValues = Array.isArray(next.y)
        ? next.y
        : Array.isArray(next.y?._inputArray)
          ? next.y._inputArray
          : [];
      const xValues = Array.isArray(next.x)
        ? next.x
        : Array.isArray(next.x?._inputArray)
          ? next.x._inputArray
          : [];
      const vals = yValues.length ? yValues : xValues;
      return vals.map((v) => parseNumeric(v));
    };

    const semaforoColorByValue = (v) => {
      if (!Number.isFinite(v)) return color;
      if (v >= 90) return SEMAFORO.ok;
      if (v >= 80) return SEMAFORO.warning;
      return SEMAFORO.alert;
    };

    if (next.type === 'bar') {
      const values = inferValuesForSemaforo();
      const hasNumericValues = values.some((v) => Number.isFinite(v));
      const textValues = Array.isArray(next.text) ? next.text.map((v) => parseNumeric(v)) : [];
      const hasTextNumericValues = textValues.some((v) => Number.isFinite(v));
      const semaforoBase = hasNumericValues ? values : textValues;

      let semanticPctValues = [];
      if (isPctStyleFigure && figureId === 'fig_avance' && Array.isArray(next.x)) {
        semanticPctValues = next.x.map((entidad) => {
          const key = String(entidad || '').trim().toUpperCase();
          return Number(pctByEntidadAvance.get(key));
        });
      }
      if (isPctStyleFigure && figureId === 'fig_cascada' && Array.isArray(next.y)) {
        semanticPctValues = next.y.map((entidad) => {
          const key = String(entidad || '').trim().toUpperCase();
          return Number(pctByEntidadEntidades.get(key));
        });
      }
      const hasSemanticPctValues = semanticPctValues.some((v) => Number.isFinite(v));

      const colorByBar = hasSemanticPctValues
        ? semanticPctValues.map((v) => semaforoColorByValue(v))
        : (hasNumericValues || hasTextNumericValues)
        ? semaforoBase.map((v) => semaforoColorByValue(v))
        : isPctStyleFigure
          ? values.map((_, rank) => getRankColor(rank, values.length))
          : color;

      const existingMarker = next.marker || {};

      next.marker = {
        ...existingMarker,
        color: colorByBar,
        line: { color: '#ffffff', width: isPctStyleFigure ? 1 : 1.2 },
        opacity: 0.94,
      };

      if (isPctStyleFigure) {
        next.textposition = next.orientation === 'h' ? 'outside' : 'auto';
        next.cliponaxis = false;
      }

      if (!next.hovertemplate) {
        next.hovertemplate = '%{x}<br><b>%{y}</b><extra></extra>';
      }
    }

    if (next.type === 'scatter') {
      next.line = { color, width: 3, shape: 'spline', smoothing: 0.8, ...(next.line || {}) };
      next.marker = { color, size: 7, ...(next.marker || {}) };
      if (next.fill === 'tozeroy' || next.fill === 'tonexty') {
        next.fillcolor = 'rgba(13, 148, 136, 0.14)';
      }
    }

    if (next.type === 'pie') {
      next.marker = {
        ...(next.marker || {}),
        colors: (next.marker && next.marker.colors) || [SEMAFORO.ok, SEMAFORO.warning, SEMAFORO.alert, '#1d4ed8'],
        line: { color: '#ffffff', width: 2 },
      };
      next.pull = next.pull || 0.02;
    }

    return next;
  });

  return themed;
}

function renderGraphs() {
  graphPanel.className = 'panel active';
  const wrap = document.createElement('div');
  wrap.className = 'grid';
  graphPanel.appendChild(wrap);

  const figures = getRenderableFigures();
  const cluesLookup = buildCluesLookupByEntidad();

  if (subtitle) {
    const nTables = Object.keys(data.tables || {}).length;
    subtitle.textContent = `Visualizacion general con ${figures.length} grafica(s) y ${nTables} tabla(s).`;
  }

  figures.forEach((item, i) => {
    const card = document.createElement('article');
    card.className = 'chart-card';
    const chartId = `chart-${i}`;
    const el = document.createElement('div');
    el.id = chartId;
    el.className = 'chart';
    card.appendChild(el);
    wrap.appendChild(card);

    const baseFigure = item.figure || {};
    const figure = enrichFigureWithMissingClues(item, baseFigure, cluesLookup);
    const themedFigure = applyDashboardTheme(figure, item.id || '');
    const finalLayout = themedFigure.layout || {};

    if (typeof themedFigure?.layout?.height === 'number') {
      el.style.height = `${themedFigure.layout.height}px`;
      card.style.minHeight = `${Math.max(themedFigure.layout.height + 20, 180)}px`;
    }

    Plotly.react(chartId, themedFigure.data || [], finalLayout, {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    });
  });

  if (!figures.length) {
    graphPanel.innerHTML = '<p>No hay graficas disponibles.</p>';
  }
}

function renderTablePanel(name, tableData) {
  const panelId = `panel-${name}`;
  const section = document.createElement('section');
  section.id = panelId;
  section.className = 'panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'table-toolbar';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'table-search';
  searchInput.placeholder = 'Buscar en la tabla...';
  searchInput.setAttribute('aria-label', `Buscar en ${name}`);
  toolbar.appendChild(searchInput);

  const tableInfo = document.createElement('p');
  tableInfo.className = 'table-info';
  toolbar.appendChild(tableInfo);

  if (tableData.excel) {
    const link = document.createElement('a');
    link.className = 'btn-excel';
    link.href = tableData.excel;
    link.download = tableData.excel;
    link.textContent = 'Descargar Excel';
    toolbar.appendChild(link);
  }
  section.appendChild(toolbar);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  const columns = tableData.columns || [];
  const allRows = Array.isArray(tableData.rows) ? tableData.rows.slice() : [];
  let activeQuery = '';
  let activeSortColumn = null;
  let activeSortDirection = 'asc';
  const sortIndicators = new Map();

  function toComparable(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function compareValues(aValue, bValue, direction) {
    const dir = direction === 'desc' ? -1 : 1;
    const aText = toComparable(aValue);
    const bText = toComparable(bValue);

    const aNumber = Number(aText);
    const bNumber = Number(bText);
    const aIsNumber = aText !== '' && Number.isFinite(aNumber);
    const bIsNumber = bText !== '' && Number.isFinite(bNumber);
    if (aIsNumber && bIsNumber) {
      return (aNumber - bNumber) * dir;
    }

    return aText.localeCompare(bText, 'es', { numeric: true, sensitivity: 'base' }) * dir;
  }

  function updateSortIndicators() {
    sortIndicators.forEach((indicator, col) => {
      if (col !== activeSortColumn) {
        indicator.textContent = '[=]';
        return;
      }
      indicator.textContent = activeSortDirection === 'asc' ? '[^]' : '[v]';
    });
  }

  function getFilteredRows() {
    const query = activeQuery.trim().toLowerCase();
    if (!query) return allRows.slice();

    return allRows.filter(row => {
      return columns.some(col => {
        const value = row[col];
        return String(value == null ? '' : value).toLowerCase().includes(query);
      });
    });
  }

  function getVisibleRows() {
    const filteredRows = getFilteredRows();
    if (!activeSortColumn) return filteredRows;

    return filteredRows.slice().sort((a, b) => {
      return compareValues(a[activeSortColumn], b[activeSortColumn], activeSortDirection);
    });
  }

  (tableData.columns || []).forEach(col => {
    const th = document.createElement('th');
    th.className = 'sortable';
    th.tabIndex = 0;

    const label = document.createElement('span');
    label.textContent = col;
    th.appendChild(label);

    const indicator = document.createElement('span');
    indicator.className = 'sort-indicator';
    indicator.textContent = '[=]';
    sortIndicators.set(col, indicator);
    th.appendChild(indicator);

    const handleSortToggle = () => {
      if (activeSortColumn === col) {
        activeSortDirection = activeSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        activeSortColumn = col;
        activeSortDirection = 'asc';
      }
      updateSortIndicators();
      renderRows();
    };

    th.addEventListener('click', handleSortToggle);
    th.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSortToggle();
      }
    });

    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  function renderRows() {
    tbody.innerHTML = '';
    const visibleRows = getVisibleRows();

    if (!visibleRows.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = columns.length || 1;
      emptyCell.className = 'table-empty';
      emptyCell.textContent = 'No hay resultados para la busqueda actual.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      visibleRows.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
          const td = document.createElement('td');
          const value = row[col];
          td.textContent = value == null ? '' : String(value);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    tableInfo.textContent = `${visibleRows.length} de ${allRows.length} registro(s)`;
  }

  searchInput.addEventListener('input', event => {
    activeQuery = event.target.value || '';
    renderRows();
  });

  updateSortIndicators();
  renderRows();

  table.appendChild(tbody);

  wrap.appendChild(table);
  section.appendChild(wrap);
  tablesRoot.appendChild(section);

  return panelId;
}

createTab('Principal - Graficas', 'panel-graficas', true);
renderSummaryMetrics();
renderGraphs();

Object.entries(data.tables || {}).forEach(([name, tableData]) => {
  const panelId = renderTablePanel(name, tableData);
  createTab(name.replace('tabla_', 'Tabla ').replace(/_/g, ' '), panelId, false);
});

window.addEventListener('resize', () => {
  document.querySelectorAll('.chart').forEach(el => Plotly.Plots.resize(el));
});
