import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from starlette.requests import Request

from auth import (
    COOKIE_ACCESS_TOKEN,
    COOKIE_REFRESH_TOKEN,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from main import refresh_token as refresh_token_endpoint


def _request_with_cookie(name: str, value: str) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"cookie", f"{name}={value}".encode("utf-8"))],
    }
    return Request(scope)


class AuthAccountStateTests(unittest.TestCase):
    def test_authenticate_user_rejects_inactive_account(self):
        db = MagicMock()
        query = MagicMock()
        db.query.return_value = query
        query.filter.return_value = query
        inactive_user = MagicMock()
        inactive_user.is_active = False
        query.first.return_value = inactive_user

        with patch("auth.verify_password") as verify_password_mock:
            result = authenticate_user(db, "admin@prodigypawns.com", "password123")
            self.assertFalse(result)
            verify_password_mock.assert_not_called()

    def test_get_current_user_rejects_inactive_account(self):
        token = create_access_token({"sub": 5})
        request = _request_with_cookie(COOKIE_ACCESS_TOKEN, token)

        db = MagicMock()
        query = MagicMock()
        db.query.return_value = query
        query.filter.return_value = query
        inactive_user = MagicMock()
        inactive_user.is_active = False
        query.first.return_value = inactive_user

        with self.assertRaises(HTTPException) as ctx:
            get_current_user(request, None, db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Account is deactivated")

    def test_refresh_rejects_inactive_account(self):
        refresh = create_refresh_token({"sub": 5})
        request = _request_with_cookie(COOKIE_REFRESH_TOKEN, refresh)

        db = MagicMock()
        query = MagicMock()
        db.query.return_value = query
        query.filter.return_value = query
        inactive_user = MagicMock()
        inactive_user.is_active = False
        query.first.return_value = inactive_user

        with self.assertRaises(HTTPException) as ctx:
            refresh_token_endpoint(request, db)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Account is deactivated")


if __name__ == "__main__":
    unittest.main()
