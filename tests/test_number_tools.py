import unittest

from everyday_tools.number_tools import convert_unit, percent_change, percent_of


class NumberToolsTests(unittest.TestCase):
    def test_percent_of(self):
        self.assertEqual(percent_of(18, 1200), 216)

    def test_non_finite_numbers_are_rejected(self):
        for value in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(value=value), self.assertRaises(ValueError):
                percent_of(value, 100)
            with self.subTest(value=value), self.assertRaises(ValueError):
                convert_unit("length", value, "m", "km")

    def test_percent_change(self):
        self.assertEqual(percent_change(80, 100), 25)
        self.assertEqual(percent_change(100, 80), -20)

    def test_percent_change_from_zero_is_rejected(self):
        with self.assertRaises(ValueError):
            percent_change(0, 5)

    def test_length_conversion(self):
        self.assertAlmostEqual(convert_unit("length", 5, "km", "m"), 5000)

    def test_weight_conversion(self):
        self.assertAlmostEqual(convert_unit("weight", 1, "kg", "g"), 1000)

    def test_time_conversion(self):
        self.assertAlmostEqual(convert_unit("time", 2, "h", "min"), 120)

    def test_temperature_conversion(self):
        self.assertAlmostEqual(convert_unit("temperature", 100, "c", "f"), 212)
        self.assertAlmostEqual(convert_unit("temperature", 32, "f", "c"), 0)

    def test_unknown_unit_is_rejected(self):
        with self.assertRaises(ValueError):
            convert_unit("length", 10, "km", "parsec")

    def test_below_absolute_zero_is_rejected(self):
        for target in ("c", "f", "k"):
            with self.subTest(target=target), self.assertRaises(ValueError):
                convert_unit("temperature", -274, "c", target)


if __name__ == "__main__":
    unittest.main()
