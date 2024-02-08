import { createContext, useContext } from 'react'

import { PickSelect } from '../utils'
import { ButtonProps } from './Button'

export type ButtonContextProps = {
	variant: PickSelect<ButtonProps, 'variant'>
}

export const ButtonContext = createContext<ButtonContextProps | undefined>(undefined)
export const useButtonContext = () => useContext(ButtonContext)
