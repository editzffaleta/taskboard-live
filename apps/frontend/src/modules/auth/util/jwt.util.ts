export type JwtSessionPayload = {
  sub: string;
  name: string;
  email: string;
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function isJwtSessionPayload(value: unknown): value is JwtSessionPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).sub === 'string' &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    typeof (value as Record<string, unknown>).email === 'string'
  );
}

/**
 * Decodifica o payload de um JWT no browser, preservando acentuação (decode UTF-8).
 * Retorna `null` para token malformado ou sem as claims esperadas ({ sub, name, email }).
 */
export function decodeJwtPayload(token: string): JwtSessionPayload | null {
  try {
    const [, payloadSegment] = token.split('.');
    if (!payloadSegment) return null;

    const bytes = base64UrlToUint8Array(payloadSegment);
    const json = new TextDecoder('utf-8').decode(bytes);
    const parsed: unknown = JSON.parse(json);

    return isJwtSessionPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
