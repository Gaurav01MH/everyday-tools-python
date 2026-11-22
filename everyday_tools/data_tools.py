"""JSON and CSV conversions using only Python's standard library."""

import csv
import io
import json
import math
from collections.abc import Mapping
from typing import Any


def _reject_json_constant(value: str) -> None:
    raise ValueError(f"Invalid JSON constant: {value}.")


def _parse_finite_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"JSON number is outside the finite range: {value}.")
    return number


def load_json(source: str) -> Any:
    """Parse standard-compliant JSON and reject non-finite numeric values."""
    return json.loads(
        source,
        parse_constant=_reject_json_constant,
        parse_float=_parse_finite_float,
    )


def format_json(source: str, indent: int = 2) -> str:
    """Validate JSON and return a consistently formatted representation."""
    value = load_json(source)
    return json.dumps(value, ensure_ascii=False, indent=indent, allow_nan=False)


def csv_to_json(source: str) -> str:
    """Convert CSV text with a header row into a JSON array of objects."""
    reader = csv.DictReader(io.StringIO(source))
    headers = reader.fieldnames
    if not headers:
        raise ValueError("CSV must contain a header row.")
    if any(not header.strip() for header in headers):
        raise ValueError("CSV column names cannot be blank.")
    if len(headers) != len(set(headers)):
        raise ValueError("CSV contains duplicate column names.")
    rows = list(reader)
    if any(None in row for row in rows):
        raise ValueError("A CSV row contains more values than the header.")
    return json.dumps(rows, ensure_ascii=False, indent=2, allow_nan=False)


def json_to_csv(source: str) -> str:
    """Convert a JSON array of objects into CSV text."""
    rows = load_json(source)
    if not isinstance(rows, list):
        raise ValueError("JSON input must be an array of objects.")
    if not rows:
        return ""
    if not all(isinstance(row, Mapping) for row in rows):
        raise ValueError("Every item in the JSON array must be an object.")

    columns: list[str] = []
    for row in rows:
        for key in row:
            if not isinstance(key, str):
                raise ValueError("JSON object keys must be strings.")
            if key not in columns:
                columns.append(key)

    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="raise")
    writer.writeheader()
    for row in rows:
        normalized = {
            key: json.dumps(value, ensure_ascii=False, allow_nan=False)
            if isinstance(value, (dict, list))
            else value
            for key, value in row.items()
        }
        writer.writerow(normalized)
    return output.getvalue().rstrip("\r\n")
