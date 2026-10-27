// Temporary app-wide preview switch. Use true to preview Pro, false for Basic.
// This is presentation gating, not a subscription entitlement or payment check.
// Replace with the signed-in account's server entitlement when billing is added.
export const features: { pro: boolean } = {
  pro: false,
};
