import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Golf Performance Tracker",
    template: "%s | Golf Performance Tracker",
  },
  description: "Persönliches Golf-Analysetool zur Verfolgung und Verbesserung der Spielleistung",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
