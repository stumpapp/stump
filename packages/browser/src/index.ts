import 'overlayscrollbars/overlayscrollbars.css'

import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'

import StumpWebClient from './App'

// https://stackoverflow.com/questions/72114775/vite-global-is-not-defined
window.global ||= window

export const DEBUG_ENV = import.meta.env.DEV
export const API_VERSION = import.meta.env.API_VERSION ?? 'v1'

dayjs.extend(LocalizedFormat)

export { StumpWebClient }
