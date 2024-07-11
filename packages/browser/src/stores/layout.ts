import { createLayoutStore } from '@stump/client'

export const useBooksLayout = createLayoutStore({ key: 'books', storage: localStorage })
export const useSeriesLayout = createLayoutStore({ key: 'series', storage: localStorage })
export const useLibrariesLayout = createLayoutStore({ key: 'libraries', storage: localStorage })
