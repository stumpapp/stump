import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { createRef, RefObject } from 'react'
import { create } from 'zustand'

export type EpubSheetType = 'settings' | 'locations' | 'customizeTheme'

export type CustomizeThemeMode = 'edit' | 'create'

export type CustomizeThemeConfig = {
	mode: CustomizeThemeMode
	name?: string
}

type IEpubSheetStore = {
	settingsSheetRef: RefObject<TrueSheet | null>
	locationsSheetRef: RefObject<TrueSheet | null>
	customizeThemeSheetRef: RefObject<TrueSheet | null>
	customizeThemeMode: CustomizeThemeMode
	customizeThemeName?: string
	openSheet: (sheet: EpubSheetType) => void
	closeSheet: (sheet: EpubSheetType) => void
	closeAllSheets: () => void
	openCustomizeTheme: (config: CustomizeThemeConfig) => void
}

export const useEpubSheetStore = create<IEpubSheetStore>((set, get) => ({
	settingsSheetRef: createRef<TrueSheet>(),
	locationsSheetRef: createRef<TrueSheet>(),
	customizeThemeSheetRef: createRef<TrueSheet>(),
	customizeThemeMode: 'edit',
	openSheet: (sheet) => {
		const state = get()
		if (sheet === 'settings') {
			state.settingsSheetRef.current?.present()
		} else if (sheet === 'locations') {
			state.locationsSheetRef.current?.present()
		} else if (sheet === 'customizeTheme') {
			state.customizeThemeSheetRef.current?.present()
		}
	},
	closeSheet: (sheet) => {
		const state = get()
		if (sheet === 'settings') {
			state.settingsSheetRef.current?.dismiss()
		} else if (sheet === 'locations') {
			state.locationsSheetRef.current?.dismiss()
		} else if (sheet === 'customizeTheme') {
			state.customizeThemeSheetRef.current?.dismiss()
		}
	},
	closeAllSheets: () => {
		const state = get()
		state.settingsSheetRef.current?.dismiss()
		state.locationsSheetRef.current?.dismiss()
		state.customizeThemeSheetRef.current?.dismiss()
	},
	openCustomizeTheme: ({ mode, name }) => {
		set({ customizeThemeMode: mode, customizeThemeName: name })
		get().customizeThemeSheetRef.current?.present()
	},
}))
