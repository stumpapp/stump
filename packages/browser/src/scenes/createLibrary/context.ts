import { createContext, useContext } from 'react'

export type ICreateLibraryContext = {
	formStep: number
	setStep: (step: number) => void
}

/**
 * A context to manage state used within the create library form, primarily to support the
 * stepped form.
 */
export const CreateLibraryContext = createContext<ICreateLibraryContext | undefined>(undefined)

/**
 * A hook to access the create library context. This will throw an error if the hook is used
 * outside of the context provider.
 */
export const useCreateLibraryContext = () => {
	const context = useContext(CreateLibraryContext)

	if (!context) {
		throw new Error('useCreateLibraryContext must be used within a CreateLibraryProvider')
	}

	return context
}
