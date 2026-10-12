/// <reference types="vite/client" />

import type { FolioBridge } from '../../shared/bridge'

declare global {
  interface Window {
    folio?: FolioBridge
  }
}

export {}
