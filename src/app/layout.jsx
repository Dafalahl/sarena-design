import { Pontano_Sans } from "next/font/google"
import "./globals.css"

const pontano = Pontano_Sans({
  subsets: ["latin"],
  weight: ["700"],
})

export const metadata = {
  title: "Sarena",
  description: "Find top designers with secure Escrow protection",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${pontano.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}