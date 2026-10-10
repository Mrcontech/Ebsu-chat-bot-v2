import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Outfit (SIL Open Font License), bundled in the repo so no internet is needed.
const outfit = localFont({
  src: "./fonts/Outfit-Variable.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EBSU Enquiry Bot", template: "%s | EBSU Enquiry Bot" },
  description: "Ask questions about admission, fees, registration, hostels, exams, results and transcripts at Ebonyi State University, Abakaliki.",
};

export const viewport: Viewport = {
  themeColor: "#f4efe8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="app-backdrop min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
