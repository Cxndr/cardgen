import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "PokeGen",
  description: "Generate CustomPokemon TCG Cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="CardGen" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
