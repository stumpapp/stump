import { createContext, useContext } from 'react'

interface Store {
	set(key: string, value: unknown): Promise<void>
	get<T>(key: string): Promise<T | null>
	has(key: string): Promise<boolean>
	delete(key: string): Promise<boolean>
	clear(): Promise<void>
	reset(): Promise<void>
	values<T>(): Promise<T[]>
	entries<T>(): Promise<Array<[key: string, value: T]>>
	length(): Promise<number>
	load(): Promise<void>
	save(): Promise<void>
	onKeyChange<T>(key: string, cb: (value: T | null) => void): Promise<() => void>
	onChange<T>(cb: (key: string, value: T | null) => void): Promise<() => void>
}

export type IDesktopAppContext = {
	store: Store
}

export const DesktopAppContext = createContext<IDesktopAppContext | null>(null)

export const useDesktopAppContext = () => {
	const ctx = useContext(DesktopAppContext)
	if (!ctx) {
		throw new Error('useDesktopAppContext must be used within a DesktopAppContext.Provider')
	}
	return ctx
}
