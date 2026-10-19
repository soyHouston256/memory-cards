import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memoria Secuencial - Juego de Cartas",
  description: "Juego de memoria con cartas secuenciales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
