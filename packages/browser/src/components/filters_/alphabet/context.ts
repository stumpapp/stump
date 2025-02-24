import { createContext, useContext } from 'react'

export type IAlphabetContext = {
	alphabet: Record<string, boolean>
}

export const AlphabetContext = createContext<IAlphabetContext>({
	alphabet: {},
})

export const useAlphabetContext = (): IAlphabetContext => useContext(AlphabetContext)
