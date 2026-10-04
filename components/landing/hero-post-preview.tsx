import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * Contoh tampilan satu postingan lomba untuk hero landing page.
 * Isinya statis dan hanya ilustrasi, bukan data asli.
 */
export function HeroPostPreview() {
  return (
    <figure>
      <Card className="shadow-[0_12px_32px_-12px_rgba(13,43,110,0.25)]">
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">Hackathon</Badge>
          <Badge tone="neutral">Terbuka untuk semua fakultas</Badge>
        </div>

        <h3 className="mt-3 text-lg font-bold leading-snug">
          Cari 2 anggota tim untuk hackathon data tingkat nasional
        </h3>
        <p className="mt-1 text-sm text-muted">
          Kami sudah punya yang paham pemodelan. Butuh yang bisa merancang tampilan
          dan menyusun presentasi.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>UI/UX</Badge>
          <Badge>Presentasi</Badge>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
          <Avatar name="Anggota Satu" size="sm" />
          <Avatar name="Anggota Dua" size="sm" className="-ml-3 ring-2 ring-white" />
          <span
            aria-hidden="true"
            className="-ml-1 inline-flex size-8 items-center justify-center rounded-full border-2 border-dashed border-gold-500 text-xs font-semibold text-gold-600"
          >
            ?
          </span>
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full border-2 border-dashed border-gold-500 text-xs font-semibold text-gold-600"
          >
            ?
          </span>
          <p className="ml-2 text-sm font-semibold">Tim butuh 2 orang lagi</p>
        </div>
      </Card>
      <figcaption className="mt-3 text-center text-sm text-muted">
        Contoh tampilan postingan
      </figcaption>
    </figure>
  );
}
