import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { createRef, RefObject } from 'react'
import { create } from 'zustand'

export type EpubSheetType = 'settings' | 'locations'

type IEpubSheetStore = {
	settingsSheetRef: RefObject<TrueSheet | null>
	locationsSheetRef: RefObject<TrueSheet | null>
	openSheet: (sheet: EpubSheetType) => void
	closeSheet: (sheet: EpubSheetType) => void
}

export const useEpubSheetStore = create<IEpubSheetStore>((set, get) => ({
	settingsSheetRef: createRef<TrueSheet>(),
	locationsSheetRef: createRef<TrueSheet>(),
	openSheet: (sheet) => {
		const state = get()
		if (sheet === 'settings') {
			state.settingsSheetRef.current?.present()
		} else if (sheet === 'locations') {
			state.locationsSheetRef.current?.present()
		}
	},
	closeSheet: (sheet) => {
		const state = get()
		if (sheet === 'settings') {
			state.settingsSheetRef.current?.dismiss()
		} else if (sheet === 'locations') {
			state.locationsSheetRef.current?.dismiss()
		}
	},
}))
