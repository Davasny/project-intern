import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Providers } from "@/app/providers"
import { frontendConfig } from "@/lib/config/frontend"
import "@/app/globals.css"
import { Geist } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: frontendConfig.NEXT_PUBLIC_APP_NAME,
  description: "Agentic-first CRM foundation",
}

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <html
    lang="en"
    className={cn("font-sans", geist.variable)}
    suppressHydrationWarning
  >
    <body>
      <Providers>
        <TooltipProvider>{children}</TooltipProvider>
      </Providers>
    </body>
  </html>
)

export default RootLayout
