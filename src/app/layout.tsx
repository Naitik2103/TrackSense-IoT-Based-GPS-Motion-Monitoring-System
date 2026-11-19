import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTrack — IoT-Based Smart Asset Tracker",
  description:
    "Engineering Project: AirTag-inspired GPS Asset Tracking System using ESP32-WROOM-32, NEO-6M GPS, MPU6050, Wi-Fi, MQTT & MOSFET power gating.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
