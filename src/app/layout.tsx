import type { Metadata } from "next"
import { Providers } from "@/app/providers"
import { frontendConfig } from "@/lib/config/frontend"
import "@/app/globals.css"
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: frontendConfig.NEXT_PUBLIC_APP_NAME,
  description: "Agentic-first CRM foundation",
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="en" className={cn("font-sans", geist.variable)}>
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
)

export default RootLayout
