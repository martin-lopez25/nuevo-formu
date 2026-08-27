import argparse
import json
from pathlib import Path

import pandas as pd


def clean_text(value: object, default: str = "") -> str:
    if pd.isna(value):
        return default
    return str(value).strip()


def write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )


def export_clues_catalog(clues_path: Path, output_dir: Path) -> None:
    clues_frame = pd.read_parquet(
        clues_path,
        columns=["clues_imb", "entidad", "nombre_de_la_unidad"],
    )
    unit_records = clues_frame.dropna(subset=["clues_imb"]).copy()
    unit_records["clues_imb"] = unit_records["clues_imb"].astype(str).str.strip().str.upper()
    unit_records["entidad"] = unit_records["entidad"].fillna("").astype(str).str.strip().str.upper()
    unit_records["nombre_de_la_unidad"] = (
        unit_records["nombre_de_la_unidad"].fillna("SIN NOMBRE").astype(str).str.strip()
    )
    unit_records = unit_records.loc[unit_records["clues_imb"] != ""]
    unit_records = unit_records.drop_duplicates(subset=["clues_imb"], keep="first")

    units = [
        {
            "clues": row["clues_imb"],
            "name": row["nombre_de_la_unidad"] or "SIN NOMBRE",
            "entity": row["entidad"],
        }
        for row in unit_records.to_dict(orient="records")
    ]

    entity_records = (
        unit_records.loc[unit_records["entidad"] != ""]
        .groupby("entidad", as_index=False)["clues_imb"]
        .nunique()
        .sort_values("entidad")
    )
    entities = [
        {
            "id": str(index).zfill(2),
            "name": row["entidad"],
            "code": str(index).zfill(2),
            "totalUnits": int(row["clues_imb"]),
        }
        for index, row in enumerate(entity_records.to_dict(orient="records"), start=1)
    ]

    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "entities.json", entities)
    write_json(output_dir / "units.json", units)
    print(f"Exportados: {len(entities)} entidades y {len(units)} unidades.")


def export_catalogs(
    questions_path: Path,
    units_path: Path,
    clues_path: Path,
    output_dir: Path,
) -> None:
    questions_frame = pd.read_excel(questions_path, sheet_name="Hoja2")
    questions_frame = questions_frame.drop(index=[0, 1, 2, 3, 5], errors="ignore")
    questions_frame = questions_frame.rename(columns={"CLUES": "preguntas"})
    question_labels = (
        questions_frame["preguntas"]
        .dropna()
        .astype(str)
        .str.strip()
        .loc[lambda values: values != ""]
        .drop_duplicates()
        .tolist()
    )
    questions = [
        {"id": index, "name": label}
        for index, label in enumerate(question_labels, start=1)
    ]

    units_frame = pd.read_excel(units_path, sheet_name="Sheet 1")
    clues_frame = pd.read_parquet(clues_path)
    unit_records = units_frame[["clues_imb", "nombre_de_la_unidad"]].merge(
        clues_frame[["clues_imb", "entidad"]].drop_duplicates(subset=["clues_imb"]),
        on="clues_imb",
        how="left",
        validate="many_to_one",
    )
    unit_records = unit_records.drop_duplicates(subset=["clues_imb"], keep="first")

    units = []
    for row in unit_records.to_dict(orient="records"):
        units.append(
            {
                "clues": clean_text(row.get("clues_imb")),
                "name": clean_text(row.get("nombre_de_la_unidad"), "SIN NOMBRE"),
                "entity": clean_text(row.get("entidad")),
            }
        )

    entity_records = (
        unit_records.assign(
            entidad=unit_records["entidad"].astype(str).str.strip(),
        )
        .loc[lambda frame: frame["entidad"] != ""]
        .groupby("entidad", as_index=False)["clues_imb"]
        .nunique()
        .sort_values("entidad")
    )
    entities = [
        {
            "id": str(index).zfill(2),
            "name": clean_text(row["entidad"]).upper(),
            "code": str(index).zfill(2),
            "totalUnits": int(row["clues_imb"]),
        }
        for index, row in enumerate(entity_records.to_dict(orient="records"), start=1)
    ]

    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "questions.json", questions)
    write_json(output_dir / "entities.json", entities)
    write_json(output_dir / "units.json", units)

    print(
        f"Exportados: {len(questions)} preguntas, "
        f"{len(entities)} entidades y {len(units)} unidades."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path)
    parser.add_argument("--units", type=Path)
    parser.add_argument("--clues", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--clues-only", action="store_true")
    arguments = parser.parse_args()

    if arguments.clues_only:
        export_clues_catalog(arguments.clues, arguments.output)
        return

    if not arguments.questions or not arguments.units:
        parser.error("--questions y --units son obligatorios sin --clues-only")

    export_catalogs(
        arguments.questions,
        arguments.units,
        arguments.clues,
        arguments.output,
    )


if __name__ == "__main__":
    main()