import { createContext, useContext } from 'react'

import { ButtonProps, PickSelect } from '../index'

export type ButtonContextProps = {
	variant: PickSelect<ButtonProps, 'variant'>
}

export const ButtonContext = createContext<ButtonContextProps | undefined>(undefined)
export const useButtonContext = () => useContext(ButtonContext)
