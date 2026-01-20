import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Missing APP_URL env var");

  const verifyLink = `${appUrl}/verify?token=${token}`;

  await transporter.sendMail({
    from: "no-reply@jan-productions.com",
    to,
    subject: "Verifica tu correo ✅",
    html: `
      <h2>Bienvenido 💙</h2>
      <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
      <a href="${verifyLink}">${verifyLink}</a>
    `,
  });
}
