import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import TopProgressBar from "../components/TopProgressBar";
import { Space_Grotesk, Space_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata = {
  title: "Sarena Design | Premium Creative Marketplace",
  description: "Marketplace for top illustrators and designers featuring an Escrow system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable} light`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-dvh flex flex-col">
        <TopProgressBar />
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}

