import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to, token) {
  const verifyLink = `${process.env.APP_URL}/verify?token=${token}`;

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
