import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, Manrope } from "next/font/google";
import { EmailFlushProvider } from "@/components/EmailFlushProvider";
import "./globals.css";

// ── Fuentes: carga local via next/font (sin render-blocking, sin DNS externo) ──
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-plus-jakarta",
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-sans",
  preload: false,
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
  preload: false,
});

export const metadata: Metadata = {
  title: "Reservio — Gestión de Salas",
  description: "Plataforma integral para la gestión de reservas de salas corporativas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${plusJakartaSans.variable} ${dmSans.variable} ${manrope.variable}`}
    >
      <head>
        {/* Material Symbols — único recurso externo restante; se carga con preconnect para minimizar latencia */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <EmailFlushProvider />
        {children}
      </body>
    </html>
  );
}
