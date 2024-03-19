import { createUserStore } from '@stump/client'

export const useUserStore = createUserStore(localStorage)
export const useUser = () => useUserStore((store) => ({ setUser: store.setUser, user: store.user }))
