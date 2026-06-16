import { createContext } from 'react'

export type TabsVariant = 'default' | 'primary'
export type TabsSize = 'default' | 'sm'
export type TabsContextProps = {
	variant: TabsVariant
	size: TabsSize
	activeOnHover?: boolean
}
export const TabsContext = createContext<TabsContextProps>({
	activeOnHover: false,
	size: 'default',
	variant: 'default',
})
