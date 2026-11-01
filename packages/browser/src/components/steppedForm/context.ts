import { createContext, useContext } from 'react'

import type { SteppedFormStep, StepStatus } from './types'

export type ISteppedFormContext = {
	/**
	 * The base path for the locale files, used for getting the correct translations
	 */
	localeBase: string
	steps: SteppedFormStep[]
	currentIndex: number
	/** the list of statuses for each step in the form */
	statuses: StepStatus[]
	isFirst: boolean
	isReview: boolean
	/** jump to the provided index, validating for forward direction jumps */
	goTo: (index: number) => Promise<void>
	next: () => Promise<void>
	back: () => void
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
		throw new Error('useSteppedFormContext must be used within a SteppedForm.Provider')
	}
	return context
}
