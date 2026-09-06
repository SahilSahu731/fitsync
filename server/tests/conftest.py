import os

# Supply test-only settings before application modules are imported.
os.environ.update(
    APP_ENV="test",
    MONGODB_URI="mongodb://localhost:27017",
    JWT_SECRET="test-jwt-secret",
    OTP_HMAC_SECRET="test-otp-secret",
    RESEND_API_KEY="test-resend-key",
    GOOGLE_WEB_CLIENT_ID="test-google-client-id",
)
