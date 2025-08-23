import { createContext, ReactNode, useContext } from 'react'

type RouterContextValue = {
	basePath: string
}

const RouterContext = createContext<RouterContextValue>({ basePath: '' })

type RouterProviderProps = {
	basePath?: string
	children: ReactNode
}

export function RouterProvider({ basePath = '', children }: RouterProviderProps) {
	return <RouterContext.Provider value={{ basePath }}>{children}</RouterContext.Provider>
}

export function useRouterContext() {
	return useContext(RouterContext)
}
