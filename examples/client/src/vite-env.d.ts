/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCRIPT_SERVER_URL?: string
  readonly VITE_COINRAY_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
