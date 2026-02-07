type MaskEmailOptions = {
  minLocalVisible?: number;
  maxLocalVisible?: number;
  maskChar?: string;
  maxDomainUnmasked?: number;
};

function maskLoose(raw: string, maskChar: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "****";
  const keep = Math.min(2, trimmed.length);
  const maskedCount = Math.max(2, trimmed.length - keep);
  return `${trimmed.slice(0, keep)}${maskChar.repeat(maskedCount)}`;
}

export function maskEmail(email: string, opts: MaskEmailOptions = {}): string {
  const maskChar = opts.maskChar ?? "*";
  const minLocalVisible = opts.minLocalVisible ?? 2;
  const maxLocalVisible = opts.maxLocalVisible ?? 3;
  const maxDomainUnmasked = opts.maxDomainUnmasked ?? 24;

  if (typeof email !== "string") return "****";

  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  const hasSingleAt = atIndex > 0 && atIndex === trimmed.lastIndexOf("@");
  if (!hasSingleAt) return maskLoose(trimmed, maskChar);

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!local || !domain) return maskLoose(trimmed, maskChar);

  const visible = Math.min(
    local.length,
    Math.max(minLocalVisible, Math.min(maxLocalVisible, local.length))
  );
  const maskedLocalCount = Math.max(1, local.length - visible);
  const maskedLocal = `${local.slice(0, visible)}${maskChar.repeat(maskedLocalCount)}`;

  let maskedDomain = domain;
  if (domain.length > maxDomainUnmasked) {
    const head = domain.slice(0, 6);
    const tail = domain.slice(-6);
    const midCount = Math.max(3, domain.length - head.length - tail.length);
    maskedDomain = `${head}${maskChar.repeat(midCount)}${tail}`;
  }

  return `${maskedLocal}@${maskedDomain}`;
}
