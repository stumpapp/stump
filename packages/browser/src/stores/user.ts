import { createUserStore } from '@stump/client'
import { useShallow } from 'zustand/react/shallow'

export const useUserStore = createUserStore(localStorage)
export const useUser = () =>
	useUserStore(useShallow((store) => ({ setUser: store.setUser, user: store.user })))
