// Public operator details; use the name shown on the app's store listing.
export const legalOperator = process.env.LEGAL_OPERATOR_NAME?.trim() || "FitSync";
const configuredEmail = process.env.SUPPORT_EMAIL?.trim();
export const supportEmail =
  configuredEmail && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(configuredEmail)
    ? configuredEmail
    : "sahillsahudev@gmail.com";
export const legalUpdated = "November 20, 2026";
