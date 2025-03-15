import 'overlayscrollbars/overlayscrollbars.css'

import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

import StumpWebClient from './App'

// https://stackoverflow.com/questions/72114775/vite-global-is-not-defined
window.global ||= window

export const DEBUG_ENV = import.meta.env.DEV
export const API_VERSION = import.meta.env.API_VERSION ?? 'v1'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(durationPlugin)

export { StumpWebClient }
