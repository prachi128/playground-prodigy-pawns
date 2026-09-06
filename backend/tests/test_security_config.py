import os
import unittest
from unittest.mock import patch


class SecurityConfigTests(unittest.TestCase):
    def test_get_secret_key_rejects_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            from security_config import get_secret_key

            with self.assertRaises(RuntimeError):
                get_secret_key()

    def test_get_secret_key_rejects_placeholder(self):
        with patch.dict(
            os.environ,
            {"SECRET_KEY": "your-secret-key-change-this-in-production-make-it-long-and-random"},
            clear=True,
        ):
            from security_config import get_secret_key

            with self.assertRaises(RuntimeError):
                get_secret_key()

    def test_get_secret_key_rejects_short(self):
        with patch.dict(os.environ, {"SECRET_KEY": "short-but-not-placeholder"}, clear=True):
            from security_config import get_secret_key

            with self.assertRaises(RuntimeError):
                get_secret_key()

    def test_get_secret_key_accepts_strong_value(self):
        secret = "a" * 32
        with patch.dict(os.environ, {"SECRET_KEY": secret}, clear=True):
            from security_config import get_secret_key

            self.assertEqual(get_secret_key(), secret)

    def test_cookie_attrs_secure_in_production(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}, clear=True):
            from security_config import get_cookie_attrs

            attrs = get_cookie_attrs()
            self.assertTrue(attrs.get("httponly"))
            self.assertEqual(attrs.get("samesite"), "lax")
            self.assertTrue(attrs.get("secure"))

    def test_cookie_attrs_insecure_in_development(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}, clear=True):
            from security_config import get_cookie_attrs

            attrs = get_cookie_attrs()
            self.assertNotIn("secure", attrs)

    def test_cookie_secure_override(self):
        with patch.dict(
            os.environ,
            {"ENVIRONMENT": "development", "COOKIE_SECURE": "true"},
            clear=True,
        ):
            from security_config import get_cookie_attrs

            self.assertTrue(get_cookie_attrs().get("secure"))

    def test_cors_includes_dev_defaults(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}, clear=True):
            from security_config import get_cors_origins

            origins = get_cors_origins()
            self.assertIn("http://localhost:3000", origins)

    def test_cors_production_requires_configured_origin(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}, clear=True):
            from security_config import get_cors_origins

            with self.assertRaises(RuntimeError):
                get_cors_origins()

    def test_cors_production_uses_frontend_url(self):
        with patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "production",
                "FRONTEND_URL": "https://app.toruschess.com/",
                "CORS_ORIGINS": "https://www.toruschess.com",
            },
            clear=True,
        ):
            from security_config import get_cors_origins

            origins = get_cors_origins()
            self.assertEqual(
                origins,
                ["https://www.toruschess.com", "https://app.toruschess.com"],
            )
            self.assertNotIn("http://localhost:3000", origins)


if __name__ == "__main__":
    unittest.main()
