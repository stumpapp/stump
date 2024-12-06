import { createContext, useContext } from 'react'

export type ISteppedFormContext = {
	/**
	 * The base path for the locale files, used for getting the correct translations
	 */
	localeBase: string
	/**
	 * The number of steps before the review step (so really the number of steps - 1)
	 */
	stepsBeforeReview: number
	/**
	 * The current step in the form
	 */
	currentStep: number
	/**
	 * A function to set the current step in the form
	 */
	setStep: (step: number) => void
}

/**
 * A context to manage state used within a stepped form, so any nested child components can
 * access the current step and update it.
 */
export const SteppedFormContext = createContext<ISteppedFormContext | undefined>(undefined)

/**
 * A hook to access the stepped form context. This will throw an error if the hook is used
 * outside of the context provider.
 */
export const useSteppedFormContext = () => {
	const context = useContext(SteppedFormContext)

	if (!context) {
		throw new Error('useSteppedFormContext must be used within a SteppedFormProvider')
	}

	return context
}
