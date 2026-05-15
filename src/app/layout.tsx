import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Golf Performance Tracker",
    template: "%s | Golf Performance Tracker",
  },
  description: "Persönliches Golf-Analysetool zur Verfolgung und Verbesserung der Spielleistung",
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
