import { createNewReaderStore, createReaderStore } from '@stump/client'

export const useReaderStore = createReaderStore(localStorage)
export const useNewReaderStore = createNewReaderStore(localStorage)
