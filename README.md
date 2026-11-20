# Everyday Tools (Python)

A small, beginner-friendly collection of everyday utilities. The first version uses **only Python's standard library**. It does not upload files, need an account, or require a third-party package.

## Requirements

- Python 3.11 or newer (tested with Python 3.13.5)

## Run it

Open this folder in VS Code, choose **Terminal → New Terminal**, and run:

```bash
python --version
python -m everyday_tools --help
```

On Windows, `py` can be used instead of `python` if that is how Python is installed. No `pip install` is needed. Run commands from this folder, where the `everyday_tools` directory is visible.

## Commands

| Task | Example |
|---|---|
| Count text | `python -m everyday_tools text-count --text "Hello from Pune"` |
| Count a file | `python -m everyday_tools text-count --file notes.txt` |
| Change case | `python -m everyday_tools case --mode upper --text "hello world"` |
| Clean lines | `python -m everyday_tools clean-lines --file names.txt --sort` |
| Format JSON | `python -m everyday_tools json-format data.json --output formatted.json` |
| Validate JSON | `python -m everyday_tools json-check data.json` |
| CSV to JSON | `python -m everyday_tools csv-to-json examples/people.csv --output people.json` |
| JSON to CSV | `python -m everyday_tools json-to-csv examples/people.json --output people.csv` |
| URL encode | `python -m everyday_tools url-encode --text "hello world & Pune"` |
| URL decode | `python -m everyday_tools url-decode --text "hello%20world"` |
| Base64 encode text | `python -m everyday_tools base64-encode --text "hello"` |
| Base64 decode text | `python -m everyday_tools base64-decode --text "aGVsbG8="` |
| Percentage of amount | `python -m everyday_tools percent-of 18 1200` |
| Percentage change | `python -m everyday_tools percent-change 80 100` |
| Unit conversion | `python -m everyday_tools convert length 5 km m` |

Text commands accept exactly one of `--text` or `--file`. Commands that transform text can use `--output result.txt` to save instead of printing to the terminal. JSON and CSV commands take a file path directly. The CSV-to-JSON conversion keeps CSV values as strings; it does not guess data types.

### Supported units

- Length: `mm`, `cm`, `m`, `km`, `in`, `ft`, `yd`, `mi`
- Weight: `mg`, `g`, `kg`, `tonne`, `oz`, `lb`
- Time: `ms`, `s`, `min`, `h`, `day`
- Temperature: `c`, `f`, `k`

Base64 commands handle **UTF-8 text only**, not binary files. Text word counts split on whitespace; they are simple counts, not linguistic analysis. Character counts use Python Unicode code points, not visual grapheme clusters.

## Run the tests

```bash
python -m unittest discover -s tests -v
```

The tests use `unittest`, which is included with Python.

## Project structure

```text
everyday-tools-python/
├── everyday_tools/       # Reusable utility functions and command-line interface
├── tests/                # Automated tests (unittest)
├── examples/             # Small CSV and JSON examples
├── .github/workflows/    # Run tests on GitHub pushes and pull requests
├── .gitignore
├── LICENSE
└── README.md
```

The utility functions are separated from the command-line interface. A future website or API can import the functions without needing to imitate terminal commands.

## Roadmap

1. **v0.1 — Core Python:** text, JSON/CSV, URL/Base64 text, percentages, and common unit conversions.
2. **v0.2 — File utilities:** add carefully tested PDF and image operations behind optional dependencies.
3. **v0.3 — API layer:** expose stable core functions through a small Python API when the main app is ready.
4. **Web app:** build only after the Python features and their tests are dependable.

New utilities should be added only when the feature has a clear use, a simple interface, and tests. Avoid dependencies until a feature actually needs them.

## Scope of this version

This is a Python command-line foundation, not the future website. It intentionally does not include PDF, image, QR, GUI, account, network-upload, or binary-file processing yet. Those features will be considered only after their Python libraries and privacy implications are tested.
