"""Small percentage and unit-conversion helpers."""

import math


def _require_finite(value: float, label: str = "Value") -> None:
    if not math.isfinite(value):
        raise ValueError(f"{label} must be a finite number.")


LENGTH_TO_METRES = {
    "mm": 0.001,
    "cm": 0.01,
    "m": 1.0,
    "km": 1000.0,
    "in": 0.0254,
    "ft": 0.3048,
    "yd": 0.9144,
    "mi": 1609.344,
}
WEIGHT_TO_GRAMS = {
    "mg": 0.001,
    "g": 1.0,
    "kg": 1000.0,
    "tonne": 1_000_000.0,
    "oz": 28.349523125,
    "lb": 453.59237,
}
TIME_TO_SECONDS = {
    "ms": 0.001,
    "s": 1.0,
    "min": 60.0,
    "h": 3600.0,
    "day": 86400.0,
}


def percent_of(percent: float, amount: float) -> float:
    _require_finite(percent, "Percentage")
    _require_finite(amount, "Amount")

    # Divide the larger magnitude first to avoid avoidable overflow or underflow.
    if abs(amount) >= abs(percent):
        result = (amount / 100) * percent
    else:
        result = amount * (percent / 100)
    _require_finite(result, "Percentage result")
    return result


def percent_change(old_value: float, new_value: float) -> float:
    _require_finite(old_value, "Starting value")
    _require_finite(new_value, "New value")
    if old_value == 0:
        raise ValueError("The starting value cannot be zero for percentage change.")

    scale = abs(old_value)
    difference = new_value - old_value
    if math.isfinite(difference):
        result = difference / scale * 100
    else:
        # Scale first only when subtraction overflows for opposite large values.
        result = (new_value / scale - old_value / scale) * 100
    _require_finite(result, "Percentage change")
    return result


def convert_unit(category: str, value: float, from_unit: str, to_unit: str) -> float:
    """Convert length, weight, time, or temperature units."""
    _require_finite(value)
    if category == "temperature":
        return _convert_temperature(value, from_unit, to_unit)

    unit_sets = {
        "length": LENGTH_TO_METRES,
        "weight": WEIGHT_TO_GRAMS,
        "time": TIME_TO_SECONDS,
    }
    if category not in unit_sets:
        raise ValueError("Category must be length, weight, time, or temperature.")
    units = unit_sets[category]
    if from_unit not in units or to_unit not in units:
        choices = ", ".join(units)
        raise ValueError(f"Unknown {category} unit. Available units: {choices}.")

    conversion_factor = units[from_unit] / units[to_unit]
    result = value * conversion_factor
    _require_finite(result, "Converted value")
    return result


def _convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    to_celsius = {
        "c": lambda temp: temp,
        "f": lambda temp: (temp - 32) * (5 / 9),
        "k": lambda temp: temp - 273.15,
    }
    from_celsius = {
        "c": lambda temp: temp,
        "f": lambda temp: temp * (9 / 5) + 32,
        "k": lambda temp: temp + 273.15,
    }
    if from_unit not in to_celsius or to_unit not in from_celsius:
        raise ValueError("Temperature units must be c, f, or k.")

    celsius = to_celsius[from_unit](value)
    _require_finite(celsius, "Converted temperature")
    if celsius < -273.15:
        raise ValueError("Temperature cannot be below absolute zero.")

    result = from_celsius[to_unit](celsius)
    _require_finite(result, "Converted temperature")
    return result
