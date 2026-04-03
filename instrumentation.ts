export const register = async () => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { sweepStaleInteractiveServers } = await import(
      "@/features/opencode/lib/get-opencode-client"
    )
    await sweepStaleInteractiveServers()
  }
}
