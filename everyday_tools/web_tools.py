"""Encoding helpers for text, not binary files."""

import base64
import binascii
from urllib.parse import quote, unquote


def url_encode(text: str) -> str:
    return quote(text, safe="")


def url_decode(text: str) -> str:
    return unquote(text)


def base64_encode_text(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def base64_decode_text(encoded: str) -> str:
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Input is not valid Base64 text.") from exc
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("Base64 data is valid, but it does not contain UTF-8 text.") from exc
