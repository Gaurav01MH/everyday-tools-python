import unittest

from everyday_tools.web_tools import base64_decode_text, base64_encode_text, url_decode, url_encode


class WebToolsTests(unittest.TestCase):
    def test_url_round_trip(self):
        original = "hello world & Pune"
        self.assertEqual(url_decode(url_encode(original)), original)

    def test_base64_round_trip_with_unicode(self):
        original = "नमस्ते, Python!"
        self.assertEqual(base64_decode_text(base64_encode_text(original)), original)

    def test_invalid_base64_is_rejected(self):
        with self.assertRaises(ValueError):
            base64_decode_text("not base64!")

    def test_non_utf8_base64_is_rejected(self):
        with self.assertRaises(ValueError):
            base64_decode_text("/w==")


if __name__ == "__main__":
    unittest.main()
