import { Geist_Mono, Outfit } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import Providers from "@/providers/Providers"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  title: "QHUB University Portal",
  description: "QHUB Nigerian university portal website Homepage",
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        outfit.variable,
        "font-sans"
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
