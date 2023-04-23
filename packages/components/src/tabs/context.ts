import { createContext } from 'react'

export type TabsVariant = 'default' | 'primary'
export type TabsContextProps = {
	variant: TabsVariant
	activeOnHover?: boolean
}
export const TabsContext = createContext<TabsContextProps>({
	activeOnHover: false,
	variant: 'default',
})
