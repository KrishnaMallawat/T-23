import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config import GMAIL_USER, GMAIL_APP_PASSWORD, APP_NAME, FRONTEND_URL


# ── Low-level sender ──────────────────────────────────────────────────────────

def _send(to_email: str, subject: str, html_body: str):
    """Send an HTML email via Gmail SMTP SSL."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{APP_NAME} <{GMAIL_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())


# ── Shared HTML wrapper ───────────────────────────────────────────────────────

def _base_template(content_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);
                        padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#ffffff;
                            letter-spacing:-0.5px;">📅 {APP_NAME}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              {content_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;
                        border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © 2026 {APP_NAME}. You're receiving this because you have an account with us.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


# ── OTP Verification Email ────────────────────────────────────────────────────

def send_otp_email(to_email: str, full_name: str, otp_code: str):
    digits_html = "".join(
        f'<span style="display:inline-block;width:44px;height:52px;line-height:52px;'
        f'margin:0 4px;border-radius:8px;background:#4f46e5;color:#ffffff;'
        f'font-size:24px;font-weight:700;text-align:center;">{d}</span>'
        for d in otp_code
    )

    content = f"""
      <h2 style="margin:0 0 6px;font-size:22px;color:#111827;">
        Verify your email address
      </h2>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi <strong>{full_name}</strong>, welcome to {APP_NAME}!<br/>
        Use the code below to verify your account. It expires in <strong>10 minutes</strong>.
      </p>

      <div style="text-align:center;margin:0 0 28px;">
        {digits_html}
      </div>

      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;
                  padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>

      <p style="margin:0;font-size:13px;color:#9ca3af;">
        Didn't sign up? You can safely ignore this email — no account will be created.
      </p>
    """

    _send(
        to_email,
        subject=f"Your {APP_NAME} verification code: {otp_code}",
        html_body=_base_template(content),
    )


# ── Password Reset Email ──────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, full_name: str, reset_token: str):
    reset_url = f"{FRONTEND_URL}/reset-password.html?token={reset_token}"

    content = f"""
      <h2 style="margin:0 0 6px;font-size:22px;color:#111827;">
        Reset your password
      </h2>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi <strong>{full_name}</strong>,<br/>
        We received a request to reset your password. Click the button below to choose
        a new password. This link is valid for <strong>15 minutes</strong>.
      </p>

      <div style="text-align:center;margin:0 0 28px;">
        <a href="{reset_url}"
           style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                  color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;
                  border-radius:8px;letter-spacing:0.3px;">
          Reset My Password
        </a>
      </div>

      <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">
        Or copy this link into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;color:#4f46e5;word-break:break-all;">
        {reset_url}
      </p>

      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
                  padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          🔒 If you didn't request this, your account is safe — just ignore this email.
          The link will expire automatically.
        </p>
      </div>
    """

    _send(
        to_email,
        subject=f"Reset your {APP_NAME} password",
        html_body=_base_template(content),
    )


# ── Booking Confirmation Email ────────────────────────────────────────────────

def send_booking_confirmation_email(
    to_email: str,
    full_name: str,
    service_title: str,
    slot_start: str,
    slot_end: str,
    provider_name: str,
    booking_id: int,
):
    content = f"""
      <h2 style="margin:0 0 6px;font-size:22px;color:#111827;">
        Booking Confirmed! 🎉
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi <strong>{full_name}</strong>, your appointment has been booked successfully.
      </p>

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;
                  padding:20px 24px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;">
              <span style="font-size:13px;color:#6b7280;">Service</span><br/>
              <strong style="font-size:15px;color:#111827;">{service_title}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-top:1px solid #d1fae5;">
              <span style="font-size:13px;color:#6b7280;">Provider</span><br/>
              <strong style="font-size:15px;color:#111827;">{provider_name}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-top:1px solid #d1fae5;">
              <span style="font-size:13px;color:#6b7280;">Date &amp; Time</span><br/>
              <strong style="font-size:15px;color:#111827;">{slot_start} → {slot_end}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-top:1px solid #d1fae5;">
              <span style="font-size:13px;color:#6b7280;">Booking ID</span><br/>
              <strong style="font-size:15px;color:#4f46e5;">#{booking_id}</strong>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;font-size:13px;color:#9ca3af;">
        You can manage your bookings from your dashboard. Need to reschedule or cancel?
        Log in to {APP_NAME} and visit My Bookings.
      </p>
    """

    _send(
        to_email,
        subject=f"Booking confirmed — {service_title} | {APP_NAME}",
        html_body=_base_template(content),
    )
