import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { createRef, RefObject } from 'react'
import { create } from 'zustand'

export type EpubSheetType =
	| 'settings'
	| 'annotations'
	| 'tableOfContents'
	| 'customizeTheme'
	| 'tts'

export type CustomizeThemeMode = 'edit' | 'create'

export type CustomizeThemeConfig = {
	mode: CustomizeThemeMode
	name?: string
}

type IEpubSheetStore = {
	settingsSheetRef: RefObject<TrueSheet | null>
	tableOfContentsSheetRef: RefObject<TrueSheet | null>
	annotationsSheetRef: RefObject<TrueSheet | null>
	customizeThemeSheetRef: RefObject<TrueSheet | null>
	ttsSheetRef: RefObject<TrueSheet | null>
	customizeThemeMode: CustomizeThemeMode
	customizeThemeName?: string
	openSheet: (sheet: EpubSheetType) => void
	closeSheet: (sheet: EpubSheetType) => void
	closeAllSheets: () => void
	openCustomizeTheme: (config: CustomizeThemeConfig) => void
}

export const useEpubSheetStore = create<IEpubSheetStore>((set, get) => ({
	settingsSheetRef: createRef<TrueSheet>(),
	tableOfContentsSheetRef: createRef<TrueSheet>(),
	annotationsSheetRef: createRef<TrueSheet>(),
	customizeThemeSheetRef: createRef<TrueSheet>(),
	ttsSheetRef: createRef<TrueSheet>(),
	customizeThemeMode: 'edit',
	openSheet: (sheet) => {
		const state = get()
		if (sheet === 'settings') {
			state.settingsSheetRef.current?.present()
		} else if (sheet === 'tableOfContents') {
			state.tableOfContentsSheetRef.current?.present()
		} else if (sheet === 'annotations') {
			state.annotationsSheetRef.current?.present()
		} else if (sheet === 'customizeTheme') {
			state.customizeThemeSheetRef.current?.present()
		} else if (sheet === 'tts') {
			state.ttsSheetRef.current?.present()
		}
	},
	closeSheet: (sheet) => {
		const state = get()
		if (sheet === 'settings') {
			state.settingsSheetRef.current?.dismiss()
		} else if (sheet === 'tableOfContents') {
			state.tableOfContentsSheetRef.current?.dismiss()
		} else if (sheet === 'annotations') {
			state.annotationsSheetRef.current?.dismiss()
		} else if (sheet === 'customizeTheme') {
			state.customizeThemeSheetRef.current?.dismiss()
		} else if (sheet === 'tts') {
			state.ttsSheetRef.current?.dismiss()
		}
	},
	closeAllSheets: () => {
		const state = get()
		state.settingsSheetRef.current?.dismiss()
		state.tableOfContentsSheetRef.current?.dismiss()
		state.annotationsSheetRef.current?.dismiss()
		state.customizeThemeSheetRef.current?.dismiss()
		state.ttsSheetRef.current?.dismiss()
	},
	openCustomizeTheme: ({ mode, name }) => {
		set({ customizeThemeMode: mode, customizeThemeName: name })
		get().customizeThemeSheetRef.current?.present()
	},
}))
