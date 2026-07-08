"""Transactional email (password reset, coach invites, etc.) via SMTP / Resend API."""

import json
import logging
import os
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    """Raised when required SMTP settings are missing."""


class EmailDeliveryError(RuntimeError):
    """Raised when the provider rejects or cannot send an email."""


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


def _resend_api_key() -> str:
    key = os.getenv("RESEND_API_KEY", "").strip() or os.getenv("SMTP_PASSWORD", "").strip()
    if not key.startswith("re_"):
        raise EmailConfigurationError(
            "Resend API key not configured (set RESEND_API_KEY or SMTP_PASSWORD)"
        )
    return key


def _parse_resend_error_body(raw: bytes) -> str:
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return "Resend rejected the email request"
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return text
    if isinstance(payload, dict):
        message = payload.get("message") or payload.get("error")
        if message:
            return str(message)
    return text


def _send_via_resend_api(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    from_addr = _require_env("SMTP_FROM")
    payload = {
        "from": from_addr,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {_resend_api_key()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = _parse_resend_error_body(exc.read())
        raise EmailDeliveryError(detail) from exc
    except urllib.error.URLError as exc:
        raise EmailDeliveryError(f"Could not reach Resend API: {exc.reason}") from exc


def _send_via_smtp(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    assert_email_configured()

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

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            if os.getenv("SMTP_USE_TLS", "true").lower() == "true":
                server.starttls()
            if username and password:
                server.login(username, password)
            refused = server.sendmail(msg["From"], [to_email], msg.as_string())
            if refused:
                raise EmailDeliveryError(f"SMTP refused recipient: {refused}")
    except smtplib.SMTPException as exc:
        raise EmailDeliveryError(str(exc)) from exc


def _send_email(to_email: str, subject: str, text_body: str, html_body: str) -> None:
    _send_via_smtp(to_email, subject, text_body, html_body)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password reset link via SMTP."""
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
    _send_email(to_email, subject, text_body, html_body)
    logger.info("Password reset email sent to %s", to_email)


def _coach_invite_bodies(
    to_email: str,
    full_name: str,
    invite_url: str,
    expires_in_days: int,
) -> tuple[str, str, str]:
    day_label = "day" if expires_in_days == 1 else "days"
    subject = "You're invited to join Torus Chess as a coach"
    text_body = (
        f"Hi {full_name},\n\n"
        "You've been invited to create a coach account on Torus Chess.\n\n"
        f"Use this link to complete signup (valid for {expires_in_days} {day_label}):\n"
        f"{invite_url}\n\n"
        f"This invite is tied to {to_email} and can only be used once.\n\n"
        "If you were not expecting this invitation, you can ignore this email."
    )
    html_body = f"""
    <p>Hi {full_name},</p>
    <p>You've been invited to create a coach account on <strong>Torus Chess</strong>.</p>
    <p><a href="{invite_url}">Complete your coach signup</a>
    (link valid for {expires_in_days} {day_label})</p>
    <p>This invite is tied to <strong>{to_email}</strong> and can only be used once.</p>
    <p>If you were not expecting this invitation, you can ignore this email.</p>
    """
    return subject, text_body, html_body


def _resend_api_unavailable(exc: EmailDeliveryError) -> bool:
    message = str(exc).lower()
    return "could not reach resend api" in message or "error code: 1010" in message


def send_coach_invite_email(
    to_email: str,
    full_name: str,
    invite_url: str,
    expires_in_days: int,
) -> None:
    """Send a coach signup invite. Prefers Resend HTTP API for clear delivery errors."""
    subject, text_body, html_body = _coach_invite_bodies(
        to_email, full_name, invite_url, expires_in_days
    )

    api_key = os.getenv("RESEND_API_KEY", "").strip() or os.getenv("SMTP_PASSWORD", "").strip()
    if api_key.startswith("re_"):
        try:
            _send_via_resend_api(to_email, subject, text_body, html_body)
            logger.info("Coach invite email sent to %s via Resend API", to_email)
            return
        except EmailDeliveryError as exc:
            if not _resend_api_unavailable(exc):
                raise
            logger.warning(
                "Resend API unavailable (%s); falling back to SMTP for coach invite",
                exc,
            )

    _send_via_smtp(to_email, subject, text_body, html_body)
    logger.info("Coach invite email sent to %s via SMTP", to_email)
