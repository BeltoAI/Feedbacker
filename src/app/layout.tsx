import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Feedbacker | Belto",
  description: "One-box feedback: AI risk, originality, clarity, and the Belto Learning Score."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="bg-gray-50 text-gray-900">{children}</body></html>
  );
}
