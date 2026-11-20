import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class CommandLineTests(unittest.TestCase):
    def run_cli(self, *arguments):
        return subprocess.run(
            [sys.executable, "-m", "everyday_tools", *arguments],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_text_count_command(self):
        result = self.run_cli("text-count", "--text", "Hello from Pune")
        self.assertEqual(result.returncode, 0)
        self.assertIn("Words: 3", result.stdout)
        self.assertIn("Characters: 15", result.stdout)

    def test_percentage_command(self):
        result = self.run_cli("percent-of", "18", "1200")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "216")

    def test_file_output_command(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "formatted.json"
            result = self.run_cli(
                "json-format", "examples/people.json", "--output", str(output)
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output.exists())
            self.assertIn('"name": "Asha"', output.read_text(encoding="utf-8"))

    def test_invalid_json_returns_error(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "bad.json"
            source.write_text("{invalid}", encoding="utf-8")
            result = self.run_cli("json-check", str(source))
            self.assertEqual(result.returncode, 1)
            self.assertIn("Error:", result.stderr)


if __name__ == "__main__":
    unittest.main()
