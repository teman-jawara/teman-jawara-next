type ClassValue = string | false | null | undefined;

/** Menggabungkan nama class Tailwind; nilai kosong/false diabaikan. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
