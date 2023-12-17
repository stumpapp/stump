import { type UserPreferences } from '@stump/types'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export const EPUB_READER_DEFAULT_LIGHT_NAME = 'stump-light'
export const EPUB_READER_DEFAULT_DARK_NAME = 'stump-dark'

export type EpubReaderFlow = 'vertical' | 'horizontal'

export type EpubReaderPreferences = {
	theme: string
	fontSize: number
	setFontSize: (fontSize: number) => void
	setTheme: (theme: string) => void
}

export type EpubReaderStore = {
	preferences: EpubReaderPreferences
	setFontSize: (size: number) => void
}

// FIXME: This is not reactive, but accessing useUserStore.getState threw an error...
const tryParseUserTheme = () => {
	try {
		const { state } = JSON.parse(localStorage.getItem('stump-user-store') || '{"state": {}}')
		return (state?.userPreferences as UserPreferences)?.app_theme || 'light'
	} catch {
		return 'light'
	}
}

const defaultTheme = tryParseUserTheme()
const defaultPreferences: EpubReaderPreferences = {
	fontSize: 13,
	setFontSize: () => {},
	setTheme: () => {},
	theme: `stump-${defaultTheme}`,
}

// FIXME: [DEPRECATED] Use `createWithEqualityFn` instead of `create`
export const useEpubReader = create<EpubReaderStore>()(
	devtools(
		persist(
			(set) => ({
				preferences: defaultPreferences,
				setFontSize: (fontSize: number) =>
					set((state) => ({ preferences: { ...state.preferences, fontSize } })),
				setPreferences: (preferences: EpubReaderPreferences) => set({ preferences }),
				setTheme: (theme: string) =>
					set((state) => ({ preferences: { ...state.preferences, theme } })),
			}),
			{
				name: 'stump-epub-reader',
			},
		),
	),
)
