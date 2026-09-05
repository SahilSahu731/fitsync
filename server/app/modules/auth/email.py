import resend

from app.core.config import settings


async def send_auth_code(
    *,
    email: str,
    code: str,
) -> None:
    resend.api_key = settings.resend_api_key.get_secret_value()

    params: resend.Emails.SendParams = {
        "from": (settings.auth_email_from),
        "to": [
            email,
        ],
        "subject": (f"{code} is your FitSync verification code"),
        "html": f"""
<!doctype html>
<html>
  <body style="
    margin:0;
    padding:0;
    background:#080808;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
  ">
    <div style="
      max-width:520px;
      margin:0 auto;
      padding:48px 24px;
    ">
      <div style="
        color:#ffffff;
        font-size:24px;
        font-weight:800;
        margin-bottom:36px;
      ">
        FitSync
      </div>

      <div style="
        background:#111111;
        border:1px solid #262626;
        border-radius:20px;
        padding:32px;
      ">
        <div style="
          color:#ffffff;
          font-size:26px;
          font-weight:800;
          line-height:1.2;
        ">
          Your verification code
        </div>

        <div style="
          margin-top:12px;
          color:#a3a3a3;
          font-size:15px;
          line-height:1.6;
        ">
          Enter this code in FitSync
          to continue.
        </div>

        <div style="
          margin-top:30px;
          color:#ffffff;
          font-size:42px;
          font-weight:800;
          letter-spacing:10px;
        ">
          {code}
        </div>

        <div style="
          margin-top:28px;
          color:#737373;
          font-size:13px;
          line-height:1.6;
        ">
          This code expires in
          {settings.otp_expire_minutes}
          minutes. If you didn't request
          this code, you can safely ignore
          this email.
        </div>
      </div>
    </div>
  </body>
</html>
""",
    }

    await resend.Emails.send_async(params)
