import { createContext, useContext } from 'react'

export type IRadioGroupContext = {
	disabled?: boolean
}

export const RadioGroupContext = createContext<IRadioGroupContext | undefined>(undefined)

export const useRadioGroupContext = () => {
	const context = useContext(RadioGroupContext)

	if (!context) {
		throw new Error('useRadioGroupContext must be used within a RadioGroupProvider')
	}

	return context
}
