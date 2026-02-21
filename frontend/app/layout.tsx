// app/layout.tsx - Root Layout

import type { Metadata } from "next";
import { Inter, Fredoka } from "next/font/google";
import "./globals.css";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });

export const metadata: Metadata = {
  title: "Prodigy Pawns - Chess Academy Portal",
  description: "Learn, play, and master chess with Prodigy Pawns!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${fredoka.variable}`}>
        <ConditionalNavbar />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
