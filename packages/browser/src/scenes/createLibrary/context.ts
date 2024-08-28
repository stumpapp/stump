import { createContext, useContext } from 'react'

export type ICreateLibraryContext = {
	formStep: number
	setStep: (step: number) => void
}

export const CreateLibraryContext = createContext<ICreateLibraryContext | undefined>(undefined)

export const useCreateLibraryContext = () => {
	const context = useContext(CreateLibraryContext)

	if (!context) {
		throw new Error('useCreateLibraryContext must be used within a CreateLibraryProvider')
	}

	return context
}
