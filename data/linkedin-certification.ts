export const LINKEDIN_ISSUER = "Vulcan Defense";

export function linkedInAddCertificationUrl(input: {
  name: string;
  issuedAt: string;
  certId: string;
  certUrl: string;
  organizationName?: string;
}) {
  const issued = new Date(input.issuedAt);
  const valid = Number.isFinite(issued.getTime());
  const now = new Date();
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: input.name.trim().slice(0, 100),
    organizationName: (input.organizationName || LINKEDIN_ISSUER).slice(0, 100),
    issueYear: String(valid ? issued.getUTCFullYear() : now.getUTCFullYear()),
    issueMonth: String(valid ? issued.getUTCMonth() + 1 : now.getUTCMonth() + 1),
    certUrl: input.certUrl,
    certId: input.certId,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
