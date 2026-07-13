"""Transactional email via a Google Apps Script web app.

The script is deployed as a web app and sends mail using GmailApp, e.g.:

    function doPost(e) {
      var data = JSON.parse(e.postData.contents);
      if (data.secret !== SCRIPT_SECRET) return;  // validate
      MailApp.sendEmail({
        to: data.to,
        subject: data.subject,
        htmlBody: data.html,
        name: data.fromName,
        replyTo: data.fromEmail,
      });
      return ContentService.createTextOutput("ok");
    }

When GOOGLE_SCRIPT_URL is not configured the app runs in degraded mode and
email calls become no-ops (logged as warnings) instead of failing.
"""
import json
import logging
import urllib.error
import urllib.request

from flask import current_app

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send a transactional email. Returns True if sent, False if skipped/failed."""
    url = current_app.config.get("GOOGLE_SCRIPT_URL")
    if not url:
        logger.warning("Email skipped (GOOGLE_SCRIPT_URL not set): %s -> %s", to, subject)
        return False

    payload = {
        "secret": current_app.config.get("GOOGLE_SCRIPT_SECRET"),
        "to": to,
        "subject": subject,
        "html": html,
        "text": text or "",
        "fromEmail": current_app.config.get("MAIL_FROM", "no-reply@koda.app"),
        "fromName": current_app.config.get("MAIL_FROM_NAME", "Koda"),
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            resp.read()
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except urllib.error.URLError as exc:
        logger.exception("Failed to send email to %s: %s", to, exc)
        return False
