import resend

from app.core.config import settings


async def send_auth_code(
    *,
    email: str,
    code: str,
) -> None:
    resend.api_key = settings.resend_api_key.get_secret_value()

    text_body = (
        f"Your FitSync verification code is: {code}\n\n"
        f"This code expires in {settings.otp_expire_minutes} minutes. "
        f"If you didn't request this code, you can safely ignore this email.\n\n"
        f"— The FitSync Team"
    )

    html_body = f"""\
<!doctype html>
<html>
  <body style="
    margin:0;
    padding:0;
    background:#f4f4f5;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  ">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">

      <div style="
        color:#18181b;
        font-size:18px;
        font-weight:600;
        margin-bottom:24px;
      ">
        FitSync
      </div>

      <div style="
        background:#ffffff;
        border:1px solid #e4e4e7;
        border-radius:8px;
        padding:32px;
      ">
        <p style="
          color:#18181b;
          font-size:16px;
          font-weight:600;
          margin:0 0 8px 0;
        ">
          Verify your email
        </p>

        <p style="
          color:#52525b;
          font-size:14px;
          line-height:1.6;
          margin:0 0 24px 0;
        ">
          Enter the code below in FitSync to continue signing in.
        </p>

        <div style="
          background:#f4f4f5;
          border-radius:6px;
          padding:16px;
          text-align:center;
          color:#18181b;
          font-size:28px;
          font-weight:600;
          letter-spacing:4px;
          margin-bottom:24px;
        ">
          {code}
        </div>

        <p style="
          color:#71717a;
          font-size:13px;
          line-height:1.6;
          margin:0;
        ">
          This code expires in {settings.otp_expire_minutes} minutes.
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>

      <p style="
        color:#a1a1aa;
        font-size:12px;
        margin-top:24px;
      ">
        FitSync · This is an automated message, please do not reply.
      </p>

    </div>
  </body>
</html>
"""

    params: resend.Emails.SendParams = {
        "from": "FitSync <login@auth.sahillsahu.com>",
        "to": [email],
        "subject": f"{code} is your FitSync verification code",
        "html": html_body,
        "text": text_body,
        "reply_to": "support@sahillsahu.com",
    }

    await resend.Emails.send_async(params)
