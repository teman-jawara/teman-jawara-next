export function normalizeIndonesianWhatsAppNumber(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;

  let number = value.trim().replace(/[\s().-]/g, "");

  if (number.startsWith("+")) {
    number = number.slice(1);
  }

  if (!/^\d+$/.test(number)) return null;

  if (number.startsWith("0")) {
    number = `62${number.slice(1)}`;
  } else if (number.startsWith("8")) {
    number = `62${number}`;
  }

  // Nomor seluler Indonesia harus memakai kode negara 62
  // dan prefix nomor seluler 8.
  if (!/^628\d{8,11}$/.test(number)) {
    return null;
  }

  return number;
}