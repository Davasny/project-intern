import type { Metadata } from "next"
import { Providers } from "@/app/providers"
import { frontendConfig } from "@/lib/config/frontend"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: frontendConfig.NEXT_PUBLIC_APP_NAME,
  description: "Agentic-first CRM foundation",
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="en">
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
)

export default RootLayout
