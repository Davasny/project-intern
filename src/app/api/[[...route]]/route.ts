import { apiApp } from "@/lib/hono/api-app"

export const runtime = "nodejs"

const handler = (request: Request) => apiApp.fetch(request)

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
