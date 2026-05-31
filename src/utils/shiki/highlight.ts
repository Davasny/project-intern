import bash from "@shikijs/langs/bash"
import css from "@shikijs/langs/css"
// Languages:
import html from "@shikijs/langs/html"
import js from "@shikijs/langs/js"
import json from "@shikijs/langs/json"
import markdown from "@shikijs/langs/mdx"
import python from "@shikijs/langs/python"
import sql from "@shikijs/langs/sql"
import ts from "@shikijs/langs/ts"
import tsx from "@shikijs/langs/tsx"
import yaml from "@shikijs/langs/yaml"
import darkTheme from "@shikijs/themes/one-dark-pro"
// Themes:
import lightTheme from "@shikijs/themes/one-light"
import {
  createHighlighterCore,
  type HighlighterCore,
  type RegexEngine,
} from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

let jsEngine: RegexEngine | null = null
let highlighter: Promise<HighlighterCore> | null = null

// Settings for UI components
const Themes = {
  light: "one-light",
  dark: "one-dark-pro",
}

type Languages =
  | "bash"
  | "css"
  | "html"
  | "js"
  | "json"
  | "mdx"
  | "python"
  | "sql"
  | "ts"
  | "tsx"
  | "yaml"

const getJsEngine = (): RegexEngine => {
  jsEngine ??= createJavaScriptRegexEngine()
  return jsEngine
}

const highlight = async (): Promise<HighlighterCore> => {
  highlighter ??= createHighlighterCore({
    themes: [lightTheme, darkTheme],
    langs: [bash, js, ts, tsx, css, markdown, html, json, python, sql, yaml],
    engine: getJsEngine(),
  })
  return highlighter
}

export { highlight, type Languages, Themes }
