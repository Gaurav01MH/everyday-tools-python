"""Text utilities. Functions here do not read files or print output."""


def text_statistics(text: str) -> dict[str, int]:
    """Return simple whitespace-based word, line, and character counts."""
    return {
        "words": len(text.split()),
        "characters": len(text),
        "characters_without_whitespace": sum(not char.isspace() for char in text),
        "lines": len(text.splitlines()),
    }


def change_case(text: str, mode: str) -> str:
    """Convert text to upper, lower, title, or sentence case."""
    converters = {
        "upper": str.upper,
        "lower": str.lower,
        "title": str.title,
        "sentence": str.capitalize,
    }
    try:
        return converters[mode](text)
    except KeyError as exc:
        choices = ", ".join(converters)
        raise ValueError(f"Unknown case '{mode}'. Choose: {choices}.") from exc


def clean_lines(text: str, sort_lines: bool = False) -> str:
    """Remove blank and duplicate lines; optionally sort the remaining lines."""
    lines = list(dict.fromkeys(line.strip() for line in text.splitlines() if line.strip()))
    if sort_lines:
        lines.sort(key=str.casefold)
    return "\n".join(lines)
