import "@arco-design/web-react/dist/css/arco.css";
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "~/components/Providers";

export const metadata: Metadata = {
  title: "Virtual Energy Trading Platform",
  description: "ERCOT day-ahead and real-time energy trading simulation",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    {
      rel: "icon",
      url: "/favicon-16x16.svg",
      sizes: "16x16",
      type: "image/svg+xml",
    },
    {
      rel: "icon",
      url: "/favicon-32x32.svg",
      sizes: "32x32",
      type: "image/svg+xml",
    },
    { rel: "apple-touch-icon", url: "/icon.svg", sizes: "180x180" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
