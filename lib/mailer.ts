
import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Konfigurasi SMTP belum lengkap.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: recipient,
    subject: "Reset Kata Sandi TemanJawara",
    text: [
      "Halo!",
      "",
      "Kami menerima permintaan untuk mengatur ulang kata sandi TemanJawara.",
      `Buka tautan berikut untuk membuat kata sandi baru: ${resetUrl}`,
      "",
      "Tautan ini hanya berlaku selama 30 menit dan hanya dapat digunakan sekali.",
      "Jika kamu tidak meminta reset kata sandi, abaikan email ini.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
        <h2>Reset Kata Sandi TemanJawara</h2>
        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akunmu.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 20px;background:#193766;color:#fff;text-decoration:none;border-radius:8px">
            Atur Ulang Kata Sandi
          </a>
        </p>
        <p>Tautan berlaku selama 30 menit dan hanya dapat digunakan sekali.</p>
        <p>Jika kamu tidak meminta reset kata sandi, abaikan email ini.</p>
      </div>
    `,
  });
}
