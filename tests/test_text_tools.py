import unittest

from everyday_tools.text_tools import change_case, clean_lines, text_statistics


class TextToolsTests(unittest.TestCase):
    def test_text_statistics(self):
        self.assertEqual(
            text_statistics("Hi there\nPython!"),
            {"words": 3, "characters": 16, "characters_without_whitespace": 14, "lines": 2},
        )

    def test_empty_text_statistics(self):
        self.assertEqual(text_statistics(""), {"words": 0, "characters": 0, "characters_without_whitespace": 0, "lines": 0})

    def test_case_modes(self):
        self.assertEqual(change_case("hello WORLD", "upper"), "HELLO WORLD")
        self.assertEqual(change_case("hello WORLD", "lower"), "hello world")
        self.assertEqual(change_case("hello world", "title"), "Hello World")
        self.assertEqual(change_case("hELLO WORLD", "sentence"), "Hello world")

    def test_unknown_case_is_rejected(self):
        with self.assertRaises(ValueError):
            change_case("hello", "random")

    def test_clean_lines_removes_blanks_and_duplicates(self):
        self.assertEqual(clean_lines(" apple \n\nbanana\napple\n"), "apple\nbanana")

    def test_clean_lines_sorts_case_insensitively(self):
        self.assertEqual(clean_lines("pear\nApple\nbanana", sort_lines=True), "Apple\nbanana\npear")


if __name__ == "__main__":
    unittest.main()
