import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Icon, type IconName } from "@/components/ui/icon";
import { CategoryCarousel } from "@/components/landing/category-carousel";


const features: {
  icon: IconName;
  title: string;
  description: string;
}[] = [
  {
    icon: "users",
    title: "Cari Partner Lomba Sesama Untirta",
    description:
      "Temukan rekan tim dari berbagai fakultas dan program studi di Untirta.",
  },
  {
    icon: "search",
    title: "Temukan Skill yang Kamu Butuhkan",
    description:
      "Cari programmer, designer, penulis, hingga public speaker dalam satu platform.",
  },
  {
    icon: "link",
    title: "Terhubung dengan Mudah",
    description:
      "Hubungi calon partner secara langsung dan lanjutkan diskusi melalui platform pilihanmu.",
  },
  {
    icon: "user",
    title: "Tampilkan Profil dan Pengalaman",
    description:
      "Perkenalkan dirimu melalui informasi skill, minat, dan pengalaman yang dimiliki.",
  },
  {
    icon: "users",
    title: "Perluas Relasi Antar Mahasiswa",
    description:
      "Terhubung dengan mahasiswa dari berbagai jurusan yang aktif dan tertarik mengikuti kompetisi.",
  },
  {
    icon: "target",
    title: "Temukan Peluang Berprestasi",
    description:
      "Buka kesempatan mengikuti berbagai kompetisi bersama mahasiswa yang memiliki semangat yang sama.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* HERO */}
        <section
          id="beranda"
          className="relative overflow-hidden bg-gradient-to-b from-[#f4f8ff] via-white to-[#fffdf7]"
        >
          <Container className="flex min-h-[590px] flex-col items-center justify-center py-20 text-center sm:py-24 lg:py-28">
            <div className="max-w-5xl">
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-navy-900 sm:text-5xl lg:text-[4.2rem]">
                Temukan Partner Lomba
                <br />
                Sesama Mahasiswa{" "}
                <span className="text-navy-600">Untirta</span>
              </h1>

              <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-muted sm:text-lg sm:leading-8 lg:text-xl">
                Platform yang membantu mahasiswa Untirta menemukan rekan tim
                berdasarkan minat, keahlian, dan bidang kompetisi untuk meraih
                prestasi bersama.
              </p>

              <div className="mt-9">
                <Link
                  href="/register"
                  className={buttonStyles({
                    variant: "primary",
                    size: "lg",
                    className:
                      "min-w-[210px] rounded-xl bg-gradient-to-r from-[#0d2b6e] to-[#175dcc] px-8 text-base shadow-[0_8px_24px_rgba(13,43,110,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(13,43,110,0.25)]",
                  })}
                >
                  Cari Partnermu!
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* CATEGORIES */}
       <section className="bg-white py-[70px]">
  <Container>
    <h2 className="text-center text-3xl font-extrabold text-navy-800 sm:text-4xl">
      Lomba Untuk{" "}
      <span className="text-gold-500">Semua Bidang</span>
    </h2>

    <div className="mt-10">
      <CategoryCarousel />
    </div>
  </Container>
</section>

        {/* FEATURES */}
        <section
          id="fitur"
          className="scroll-mt-24 bg-[#f7f9fd] py-16 sm:py-20"
        >
          <Container>
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
                Fitur Unggulan
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Platform pencarian partner lomba bagi mahasiswa Untirta untuk
                membangun tim yang solid dan berprestasi.
              </p>
            </div>

            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group min-h-[185px] rounded-2xl border border-[#d5b728] bg-white p-6 shadow-[0_3px_12px_rgba(13,43,110,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(13,43,110,0.1)]"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl border border-[#e4c33b] bg-[#fffaf0] text-navy-800">
                    <Icon name={feature.icon} className="size-6" />
                  </div>

                  <h3 className="mt-5 text-base font-extrabold leading-5 text-navy-900">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-5 text-muted">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="bg-[#f7f9fd] pb-16 pt-4 sm:pb-20">
          <Container>
            <div className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#09265f] via-[#0d3c91] to-[#1762cf] px-6 py-12 text-center shadow-[0_12px_35px_rgba(13,43,110,0.2)] sm:px-12 sm:py-14">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Siap Menjadi{" "}
                <span className="text-[#ffd21a]">Jawara</span> Berikutnya?
              </h2>

              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
                Mahasiswa dari berbagai jurusan dapat bergabung. Daftarkan
                dirimu sekarang dan temukan partner lomba yang tepat untuk
                perjalanan kompetisimu!
              </p>

              <Link
                href="/register"
                className={buttonStyles({
                  variant: "accent",
                  size: "lg",
                  className:
                    "mt-8 min-w-[190px] rounded-xl bg-[#f8c515] px-8 font-extrabold text-navy-900 shadow-lg hover:bg-[#ffd42e]",
                })}
              >
                Cari Partnermu!
              </Link>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}