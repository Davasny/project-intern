import pino from "pino"
import pretty from "pino-pretty"

const prettyStream = pretty({
  colorize: true,
  ignore: "pid,hostname",
  singleLine: true,
})

export const logger = pino(
  {
    base: {
      service: "project-intern",
    },
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    redact: {
      paths: [
        "payload.token",
        "payload.authorization",
        "req.headers.authorization",
      ],
      remove: true,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  prettyStream,
)
