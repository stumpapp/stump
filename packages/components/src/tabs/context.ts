import { createContext } from 'react'

export type TabsVariant = 'default' | 'primary'
export type TabsContextProps = {
	variant: TabsVariant
}
export const TabsContext = createContext<TabsContextProps>({
	variant: 'default',
})
