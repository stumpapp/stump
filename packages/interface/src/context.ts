import { User } from '@stump/types'
import { createContext, useContext } from 'react'

type AppContext = {
	user: User
	isServerOwner: boolean
}

export const AppContext = createContext<AppContext>({} as AppContext)
export const useAppContext = () => useContext(AppContext)
