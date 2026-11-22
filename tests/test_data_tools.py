import json
import unittest

from everyday_tools.data_tools import csv_to_json, format_json, json_to_csv, load_json


class DataToolsTests(unittest.TestCase):
    def test_format_json(self):
        self.assertEqual(format_json('{"name":"Asha","age":20}'), '{\n  "name": "Asha",\n  "age": 20\n}')

    def test_invalid_json_is_rejected(self):
        with self.assertRaises(json.JSONDecodeError):
            format_json("{bad json}")

    def test_non_standard_json_constants_are_rejected(self):
        for constant in ("NaN", "Infinity", "-Infinity"):
            with self.subTest(constant=constant), self.assertRaises(ValueError):
                load_json(constant)
            with self.subTest(constant=constant), self.assertRaises(ValueError):
                format_json(constant)
            with self.subTest(constant=constant), self.assertRaises(ValueError):
                json_to_csv(f'[{{"value": {constant}}}]')

    def test_csv_to_json(self):
        result = csv_to_json("name,age\nAsha,20\nRavi,21\n")
        self.assertEqual(json.loads(result), [{"name": "Asha", "age": "20"}, {"name": "Ravi", "age": "21"}])

    def test_csv_duplicate_headers_are_rejected(self):
        with self.assertRaises(ValueError):
            csv_to_json("name,name\nA,B\n")

    def test_csv_blank_headers_are_rejected(self):
        with self.assertRaises(ValueError):
            csv_to_json(",age\nAsha,20\n")

    def test_csv_extra_values_are_rejected(self):
        with self.assertRaises(ValueError):
            csv_to_json("name,age\nAsha,20,extra\n")

    def test_json_to_csv(self):
        result = json_to_csv('[{"name":"Asha","age":20},{"name":"Ravi","city":"Pune"}]')
        self.assertEqual(result.splitlines(), ["name,age,city", "Asha,20,", "Ravi,,Pune"])

    def test_json_to_csv_requires_array_of_objects(self):
        with self.assertRaises(ValueError):
            json_to_csv('{"name":"Asha"}')
        with self.assertRaises(ValueError):
            json_to_csv('["Asha", "Ravi"]')


if __name__ == "__main__":
    unittest.main()
