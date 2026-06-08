"""Transactional email (password reset, etc.) via SMTP."""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    """Raised when required SMTP settings are missing."""


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise EmailConfigurationError(f"Missing required environment variable: {name}")
    return value


def assert_email_configured() -> None:
    """Validate SMTP settings. Call at startup or before sending."""
    _require_env("SMTP_HOST")
    _require_env("SMTP_FROM")
    _require_env("FRONTEND_URL")


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password reset link via SMTP."""
    assert_email_configured()

    subject = "Reset your Torus Chess password"
    text_body = (
        "You requested a password reset for your Torus Chess account.\n\n"
        f"Click the link below to choose a new password (valid for 1 hour):\n{reset_url}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    html_body = f"""
    <p>You requested a password reset for your Torus Chess account.</p>
    <p><a href="{reset_url}">Reset your password</a> (link valid for 1 hour)</p>
    <p>If you did not request this, you can safely ignore this email.</p>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = os.environ["SMTP_FROM"]
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()

    with smtplib.SMTP(host, port, timeout=30) as server:
        if os.getenv("SMTP_USE_TLS", "true").lower() == "true":
            server.starttls()
        if username and password:
            server.login(username, password)
        server.sendmail(msg["From"], [to_email], msg.as_string())

    logger.info("Password reset email sent to %s", to_email)
