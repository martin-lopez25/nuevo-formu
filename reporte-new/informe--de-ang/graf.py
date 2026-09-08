import pandas as pd
import os 
usuario = os.getlogin() 
base = pd.read_excel(fr"C:\Users\{usuario}\Downloads\nuevo-f\formulario-ang\bases\UnidadesIMB_CS!_v2.xlsx",sheet_name="Sheet 1")
clues = pd.read_parquet(fr"C:\Users\{usuario}\IMSS-BIENESTAR\División de Procesamiento de información - Repositorio de Datos\CLUES\clues.parquet")
import pandas as pd
import requests
import pandas as pd
from io import StringIO

sheet_id = "1maRNGDuU9rEFWZLgMdhJS1waAnJxl6ENntm-nyD0tq8"
gid = "1765182479"

url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"

# Descargar el archivo
response = requests.get(url, timeout=30)
response.raise_for_status()

# Guardar el CSV
with open("base_an.csv", "wb") as f:
    f.write(response.content)

print("CSV descargado correctamente: base_an.csv")

# Leer el archivo local
base_an = pd.read_csv("base_an.csv")

print(base_an.head())

# Base de consultorios habilitados por unidad.
consultorios_habilitados_por_unidad = (
    base_an[["clues_imb", "entidad", "nombre_de_la_unidad", "consultorios_habilitados"]]
    .dropna(subset=["clues_imb"])
    .copy()
)
consultorios_habilitados_por_unidad["consultorios_habilitados"] = pd.to_numeric(
    consultorios_habilitados_por_unidad["consultorios_habilitados"], errors="coerce"
)
consultorios_habilitados_por_unidad = (
    consultorios_habilitados_por_unidad
    .groupby(["clues_imb", "entidad", "nombre_de_la_unidad"], as_index=False)
    .agg(consultorios_habilitados=("consultorios_habilitados", "max"))
)

col = ["clues_imb"]
base = base[col]
base = base.merge(
    clues[["clues_imb", "entidad",'nombre_de_la_unidad']],
    on="clues_imb",
    how="left"
)
colum =['clues_imb', 'entidad', 'consultorios_habilitados', 'consultorio', 'pregunta', 'nombre_de_la_unidad']
base_an = base_an[colum]    
b = pd.read_excel(fr"C:\Users\{usuario}\Downloads\nuevo-f\formulario-ang\bases\UM_IMB_SUS.xlsx",sheet_name="Hoja2")
b = b.drop(index=[0, 2, 5,3,1])
b = b.drop(columns=['Unnamed: 1'])
b = b.rename(columns={
   'CLUES' : 'preguntas',
})
base_an = base_an[
    ~base_an["pregunta"].str.contains("internet|turno_consultorio|consultorios_habilitados", case=False, na=False)
]
base_conteo =base["clues_imb"].unique()
base_conteo
total_unidades = base["clues_imb"].nunique()

respondieron = base_an["clues_imb"].nunique()

sin_responder = total_unidades - respondieron
base_an = base_an.drop_duplicates()
avance_general = round(respondieron / total_unidades * 100, 1)

# TABLA NUEVA - FALTANTES POR ESTADOS
esperadas_estado = (
    base[["entidad", "clues_imb", "nombre_de_la_unidad"]]
    .dropna(subset=["entidad", "clues_imb"])
    .drop_duplicates()
)

respondidas_estado = (
    base_an[["clues_imb"]]
    .dropna(subset=["clues_imb"])
    .drop_duplicates()
    .merge(
        base[["clues_imb", "entidad"]].drop_duplicates(),
        on="clues_imb",
        how="left"
    )
    .dropna(subset=["entidad"])
    .drop_duplicates()
)

clues_sin_consultorios_estado = (
    consultorios_habilitados_por_unidad
    .loc[consultorios_habilitados_por_unidad["consultorios_habilitados"] == 0, ["entidad", "clues_imb"]]
    .dropna(subset=["entidad", "clues_imb"])
    .drop_duplicates()
)

# Si no hay consultorios habilitados, la unidad se considera atendida para faltantes.
respondidas_estado = (
    pd.concat(
        [respondidas_estado[["entidad", "clues_imb"]], clues_sin_consultorios_estado],
        ignore_index=True,
    )
    .drop_duplicates()
)

faltantes_por_estados = (
    esperadas_estado
    .merge(
        respondidas_estado[["entidad", "clues_imb"]],
        on=["entidad", "clues_imb"],
        how="left",
        indicator=True
    )
    .query('_merge == "left_only"')
    .drop(columns=["_merge"])
    .sort_values(["entidad", "clues_imb"])
    .reset_index(drop=True)
)

tabla_faltantes_por_estados = (
    faltantes_por_estados
    .groupby("entidad", as_index=False)
    .agg(clues_faltantes=("clues_imb", "nunique"))
    .sort_values("clues_faltantes", ascending=False)
)
# tablas
# TABLA 1 - AVANCE POR ENTIDAD

# Unidades esperadas
esperadas = (
    base
    .groupby("entidad")
    .size()
    .reset_index(name="esperadas")
)

# Unidades que respondieron
contestadas = (
    base_an[["entidad","clues_imb"]]
    .drop_duplicates()
    .groupby("entidad")
    .size()
    .reset_index(name="respondieron")
)

tabla_entidades = (
    esperadas
    .merge(contestadas,
           on="entidad",
           how="left")
)

tabla_entidades["respondieron"] = (
    tabla_entidades["respondieron"]
    .fillna(0)
    .astype(int)
)

tabla_entidades["porcentaje"] = (
    tabla_entidades["respondieron"]
    / tabla_entidades["esperadas"]
    *100
).round(1)

tabla_entidades = tabla_entidades.sort_values(
    "porcentaje",
    ascending=False
)
# TABLA 2 - COMPLETITUD POR UNIDAD

# Número de preguntas del formulario
n_preguntas = len(b)

# Número de consultorios por unidad (prioriza consultorios_habilitados).
consultorios_capturados = (
    base_an
    .groupby(["clues_imb", "entidad", "nombre_de_la_unidad"], as_index=False)
    ["consultorio"]
    .max()
    .rename(columns={"consultorio": "consultorios_capturados"})
)
consultorios_capturados["consultorios_capturados"] = pd.to_numeric(
    consultorios_capturados["consultorios_capturados"], errors="coerce"
)

consultorios = (
    base[["clues_imb", "entidad", "nombre_de_la_unidad"]]
    .dropna(subset=["clues_imb", "entidad"])
    .drop_duplicates()
    .merge(
        consultorios_habilitados_por_unidad,
        on=["clues_imb", "entidad", "nombre_de_la_unidad"],
        how="left"
    )
    .merge(
        consultorios_capturados,
        on=["clues_imb", "entidad", "nombre_de_la_unidad"],
        how="left"
    )
)

consultorios["consultorios_habilitados_cero"] = consultorios["consultorios_habilitados"] == 0

consultorios["consultorios"] = (
    consultorios["consultorios_habilitados"]
    .combine_first(consultorios["consultorios_capturados"])
)

consultorios = consultorios[["clues_imb", "entidad", "nombre_de_la_unidad", "consultorios", "consultorios_habilitados_cero"]]

# Preguntas respondidas
respondidas = (
    base_an
    .groupby(["clues_imb","entidad",'nombre_de_la_unidad'])
    .size()
    .reset_index(name="respondidas")
)

tabla_unidades = consultorios.merge(
    respondidas,
    on=["clues_imb", "entidad", "nombre_de_la_unidad"],
    how="left"
)

tabla_unidades["respondidas"] = tabla_unidades["respondidas"].fillna(0)
tabla_unidades["consultorios_habilitados_cero"] = tabla_unidades["consultorios_habilitados_cero"].fillna(False)

tabla_unidades["esperadas"] = (
    tabla_unidades["consultorios"].fillna(0)
    * n_preguntas
)

tabla_unidades["porcentaje"] = 0.0
mask_esperadas_positivas = tabla_unidades["esperadas"] > 0
tabla_unidades.loc[mask_esperadas_positivas, "porcentaje"] = (
    tabla_unidades.loc[mask_esperadas_positivas, "respondidas"]
    / tabla_unidades.loc[mask_esperadas_positivas, "esperadas"]
    * 100
)
tabla_unidades["porcentaje"] = tabla_unidades["porcentaje"].clip(lower=0, upper=100).round(1)

# Regla de negocio: 100% solo cuando el 0 viene explícito en consultorios_habilitados.
tabla_unidades.loc[tabla_unidades["consultorios_habilitados_cero"], "porcentaje"] = 100.0

tabla_unidades = (
    tabla_unidades
    .rename(columns={"clues_imb":"clues"})
    .sort_values("porcentaje")
)
# LISTAS PARA JINJA2
entidades = tabla_entidades.to_dict(orient="records")
unidades = tabla_unidades.to_dict(orient="records")
tabla_entidades = (
    tabla_unidades
    .groupby("entidad", as_index=False)
    .agg(
        consultorios=("consultorios","sum"),
        respondidas=("respondidas","sum"),
        esperadas=("esperadas","sum"),
        unidades=("clues","count"),
        unidades_cero_explicit=("consultorios_habilitados_cero", "sum")
    )
)

tabla_entidades["porcentaje"] = 0.0
mask_esperadas_entidad = tabla_entidades["esperadas"] > 0
tabla_entidades.loc[mask_esperadas_entidad, "porcentaje"] = (
    tabla_entidades.loc[mask_esperadas_entidad, "respondidas"]
    / tabla_entidades.loc[mask_esperadas_entidad, "esperadas"]
    * 100
)
tabla_entidades["porcentaje"] = tabla_entidades["porcentaje"].clip(lower=0, upper=100).round(1)

# Si esperadas=0, solo se marca 100 cuando TODAS las unidades son cero explícito.
tabla_entidades.loc[
    (tabla_entidades["esperadas"] == 0)
    & (tabla_entidades["unidades_cero_explicit"] == tabla_entidades["unidades"]),
    "porcentaje"
] = 100.0

# Si esperadas=0 por falta de dato, se mantiene en 0.
tabla_entidades.loc[
    (tabla_entidades["esperadas"] == 0)
    & (tabla_entidades["unidades_cero_explicit"] < tabla_entidades["unidades"]),
    "porcentaje"
] = 0.0

tabla_entidades = tabla_entidades.sort_values(
    "porcentaje",
    ascending=False
)
# Total de unidades por entidad (base completa)
total_por_entidad = (
    base
    .groupby("entidad")["clues_imb"]
    .nunique()
    .reset_index(name="total_unidades")
)

# Unidades que han respondido al menos una pregunta
respondieron_por_entidad = (
    pd.concat(
        [
            base_an[["entidad", "clues_imb"]],
            clues_sin_consultorios_estado[["entidad", "clues_imb"]],
        ],
        ignore_index=True,
    )
    .dropna(subset=["entidad", "clues_imb"])
    .drop_duplicates()
    .groupby("entidad")["clues_imb"]
    .nunique()
    .reset_index(name="unidades_respondieron")
)

tabla_avance = total_por_entidad.merge(
    respondieron_por_entidad,
    on="entidad",
    how="left"
)

tabla_avance["unidades_respondieron"] = (
    tabla_avance["unidades_respondieron"].fillna(0).astype(int)
)

tabla_avance["porcentaje"] = (
    tabla_avance["unidades_respondieron"]
    / tabla_avance["total_unidades"]
    * 100
).round(1)

tabla_avance = tabla_avance.sort_values("porcentaje", ascending=False)

from pathlib import Path
import json
from datetime import datetime

base_dir = Path(__file__).resolve().parent
salida_data = base_dir / "data.js"
html_origen = base_dir / "reporte_interactivo.html"
index_destino = base_dir / "index.html"

payload = {
    "title": "Tablero IMSS Bienestar",
    "updated_at": datetime.now().isoformat(timespec="seconds"),
    "tables": {
        "tabla_avance": {
            "columns": list(tabla_avance.columns),
            "rows": tabla_avance.to_dict(orient="records"),
            "excel": "tabla_avance.xlsx",
        },
        "tabla_entidades": {
            "columns": list(tabla_entidades.columns),
            "rows": tabla_entidades.to_dict(orient="records"),
            "excel": "tabla_entidades.xlsx",
        },
        "tabla_unidades": {
            "columns": list(tabla_unidades.columns),
            "rows": tabla_unidades.to_dict(orient="records"),
            "excel": "tabla_unidades.xlsx",
        },
        "faltantes_por_estados": {
            "columns": list(faltantes_por_estados.columns),
            "rows": faltantes_por_estados.to_dict(orient="records"),
            "excel": "faltantes_por_estados.xlsx",
        },
        "tabla_faltantes_por_estados": {
            "columns": list(tabla_faltantes_por_estados.columns),
            "rows": tabla_faltantes_por_estados.to_dict(orient="records"),
            "excel": "tabla_faltantes_por_estados.xlsx",
        },
    },
    "figures": [],
}

# Mantener los Excel sincronizados con los datos mostrados en el tablero.
tabla_avance.to_excel(base_dir / "tabla_avance.xlsx", index=False)
tabla_entidades.to_excel(base_dir / "tabla_entidades.xlsx", index=False)
tabla_unidades.to_excel(base_dir / "tabla_unidades.xlsx", index=False)
faltantes_por_estados.to_excel(base_dir / "faltantes_por_estados.xlsx", index=False)
tabla_faltantes_por_estados.to_excel(base_dir / "tabla_faltantes_por_estados.xlsx", index=False)

def json_default(value):
    if hasattr(value, "item"):
        return value.item()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    raise TypeError(f"Tipo no serializable: {type(value).__name__}")


contenido_js = "window.DASHBOARD_DATA = " + json.dumps(payload, ensure_ascii=False, default=json_default) + ";\n"
salida_data.write_text(contenido_js, encoding="utf-8")

# Si no existe el HTML origen, se crea desde index.html para que lo puedas editar
if not html_origen.exists() and index_destino.exists():
    html_origen.write_text(index_destino.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"Se creo plantilla HTML: {html_origen}")

# Evitar que cambios manuales en index.html se pierdan al regenerar datos.
if not index_destino.exists() and html_origen.exists():
    index_destino.write_text(html_origen.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"Index creado desde: {html_origen}")
elif not html_origen.exists():
    print(f"No se encontro {html_origen.name}; index.html no se pudo crear.")
else:
    print("Index conservado sin sobrescribir.")

print(f"Datos exportados en: {salida_data}")
print("Ejecuta esta celda tras modificar graficas o HTML para refrescar el tablero.")