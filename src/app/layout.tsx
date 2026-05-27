import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Providers } from "@/app/providers"
import { frontendConfig } from "@/lib/config/frontend"
import "@/app/globals.css"
import { Geist } from "next/font/google"
import { Toaster } from "sonner"
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
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
        href="#main-content"
      >
        Skip to content
      </a>
      <Providers>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </Providers>
    </body>
  </html>
)

export default RootLayout
