"""Command-line interface for Everyday Tools."""

import argparse
import sys
from pathlib import Path

from . import __version__
from .data_tools import csv_to_json, format_json, json_to_csv, load_json
from .number_tools import convert_unit, percent_change, percent_of
from .text_tools import change_case, clean_lines, text_statistics
from .web_tools import base64_decode_text, base64_encode_text, url_decode, url_encode


def _add_text_source(parser: argparse.ArgumentParser) -> None:
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--text", help="Text to process.")
    source.add_argument("--file", type=Path, help="UTF-8 text file to read.")
    parser.add_argument("--output", type=Path, help="Save the result to this file.")


def _read_source(args: argparse.Namespace) -> str:
    if args.text is not None:
        return args.text
    return args.file.read_text(encoding="utf-8")


def _write_result(result: str, output: Path | None) -> None:
    if output:
        output.write_text(result, encoding="utf-8")
        print(f"Saved: {output}")
    else:
        print(result)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="everyday-tools",
        description="Small everyday utilities, written in Python's standard library.",
    )
    parser.add_argument("--version", action="version", version=f"Everyday Tools {__version__}")
    commands = parser.add_subparsers(dest="command", required=True)

    command = commands.add_parser("text-count", help="Count words, lines, and characters.")
    _add_text_source(command)

    command = commands.add_parser("case", help="Change text case.")
    command.add_argument("--mode", required=True, choices=("upper", "lower", "title", "sentence"))
    _add_text_source(command)

    command = commands.add_parser("clean-lines", help="Remove blank and duplicate lines.")
    command.add_argument("--sort", action="store_true", help="Sort the remaining lines.")
    _add_text_source(command)

    command = commands.add_parser("json-format", help="Validate and format a JSON file.")
    command.add_argument("file", type=Path)
    command.add_argument("--output", type=Path)

    command = commands.add_parser("json-check", help="Check whether a file contains valid JSON.")
    command.add_argument("file", type=Path)

    for name, help_text in (
        ("csv-to-json", "Convert a CSV file to JSON."),
        ("json-to-csv", "Convert a JSON array of objects to CSV."),
    ):
        command = commands.add_parser(name, help=help_text)
        command.add_argument("file", type=Path)
        command.add_argument("--output", type=Path)

    for name, help_text in (
        ("url-encode", "Percent-encode text for a URL."),
        ("url-decode", "Decode percent-encoded URL text."),
        ("base64-encode", "Encode UTF-8 text as Base64."),
        ("base64-decode", "Decode Base64 back to UTF-8 text."),
    ):
        command = commands.add_parser(name, help=help_text)
        _add_text_source(command)

    command = commands.add_parser("percent-of", help="Calculate a percentage of an amount.")
    command.add_argument("percent", type=float)
    command.add_argument("amount", type=float)

    command = commands.add_parser("percent-change", help="Calculate percentage change from old to new.")
    command.add_argument("old_value", type=float)
    command.add_argument("new_value", type=float)

    command = commands.add_parser("convert", help="Convert a common unit.")
    command.add_argument("category", choices=("length", "weight", "time", "temperature"))
    command.add_argument("value", type=float)
    command.add_argument("from_unit")
    command.add_argument("to_unit")
    return parser


def run(args: argparse.Namespace) -> None:
    command = args.command
    if command == "text-count":
        stats = text_statistics(_read_source(args))
        for label, value in stats.items():
            print(f"{label.replace('_', ' ').title()}: {value}")
    elif command == "case":
        _write_result(change_case(_read_source(args), args.mode), args.output)
    elif command == "clean-lines":
        _write_result(clean_lines(_read_source(args), args.sort), args.output)
    elif command == "json-format":
        _write_result(format_json(args.file.read_text(encoding="utf-8")), args.output)
    elif command == "json-check":
        load_json(args.file.read_text(encoding="utf-8"))
        print("Valid JSON.")
    elif command == "csv-to-json":
        result = csv_to_json(args.file.read_text(encoding="utf-8"))
        _write_result(result, args.output)
    elif command == "json-to-csv":
        result = json_to_csv(args.file.read_text(encoding="utf-8"))
        _write_result(result, args.output)
    elif command in {"url-encode", "url-decode", "base64-encode", "base64-decode"}:
        text = _read_source(args)
        converters = {
            "url-encode": url_encode,
            "url-decode": url_decode,
            "base64-encode": base64_encode_text,
            "base64-decode": base64_decode_text,
        }
        _write_result(converters[command](text), args.output)
    elif command == "percent-of":
        print(f"{percent_of(args.percent, args.amount):g}")
    elif command == "percent-change":
        print(f"{percent_change(args.old_value, args.new_value):g}%")
    elif command == "convert":
        result = convert_unit(args.category, args.value, args.from_unit, args.to_unit)
        print(f"{result:g} {args.to_unit}")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        run(args)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
