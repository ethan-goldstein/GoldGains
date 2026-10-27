// Barcodes are stored as GTIN-13 so a UPC-A scan and the same product from Open Food Facts match.

export function checkDigit(body: string): number {
  // GS1: weights 3,1,3,1… from the rightmost digit of the body
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  return checkDigit(code.slice(0, -1)) === Number(code.at(-1));
}

/** Expand an 8-digit UPC-E (number system 0/1) to its 12-digit UPC-A form */
export function upcEtoA(upce: string): string | null {
  if (!/^[01]\d{7}$/.test(upce)) return null;
  const ns = upce[0]!;
  const d = upce.slice(1, 7);
  const check = upce[7]!;
  const [d1, d2, d3, d4, d5, d6] = d.split('') as [string, string, string, string, string, string];
  let body: string;
  switch (d6) {
    case '0':
    case '1':
    case '2':
      body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
      break;
    case '3':
      body = `${d1}${d2}${d3}00000${d4}${d5}`;
      break;
    case '4':
      body = `${d1}${d2}${d3}${d4}00000${d5}`;
      break;
    default:
      body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
  return `${ns}${body}${check}`;
}

/**
 * Normalize a scanned or typed code to the key we store. UPC-A (12) gains a leading 0,
 * UPC-E expands, EAN-8 stays as-is (it has its own namespace), GTIN-14 drops a leading 0.
 */
export function normalizeGtin(raw: string, format?: string): string {
  const code = raw.replace(/\D/g, '');
  if (format === 'upc_e' || (code.length === 8 && format !== 'ean_8' && /^[01]/.test(code) && !isValidGtin(code))) {
    const a = upcEtoA(code);
    if (a) return `0${a}`;
  }
  if (code.length === 12) return `0${code}`;
  if (code.length === 14 && code.startsWith('0')) return code.slice(1);
  return code;
}
