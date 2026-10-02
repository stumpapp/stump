// @vitest-environment jsdom

import { ColorSpace, OKLCH, sRGB } from 'colorjs.io/fn'
import { act, type ReactNode, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppTheme from '~/components/appSettings/preferences/AppTheme'
import type { PickerProps } from '~/components/ui/picker/types'
import { useEpubTheme, useEpubThemesStore } from '~/stores/epub'
import { usePreferencesStore } from '~/stores/user'

import enUS from '../../../../packages/i18n/src/locales/en-US.json'
import koKR from '../../../../packages/i18n/src/locales/ko-KR.json'
import { useColorScheme } from '../useColorScheme'

const native = vi.hoisted(() => ({
	storage: new Map<string, string>(),
	system: 'light' as 'light' | 'dark',
	preference: 'system' as 'light' | 'dark' | 'system',
	listeners: new Set<() => void>(),
	setColorScheme: vi.fn(),
}))

vi.mock('@stump/client', () => ({ createUserStore: () => ({}) }))
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('~/stores/store', () => ({
	ZustandMMKVStorage: {
		getItem: (key: string) => native.storage.get(key) ?? null,
		setItem: (key: string, value: string) => native.storage.set(key, value),
		removeItem: (key: string) => native.storage.delete(key),
	},
}))
vi.mock('nativewind', async () => {
	const { useSyncExternalStore } = await import('react')
	const snapshot = () => (native.preference === 'system' ? native.system : native.preference)
	native.setColorScheme.mockImplementation((value: typeof native.preference) => {
		native.preference = value
		native.listeners.forEach((notify) => notify())
	})
	return {
		useColorScheme: () => ({
			colorScheme: useSyncExternalStore((notify) => {
				native.listeners.add(notify)
				return () => native.listeners.delete(notify)
			}, snapshot),
			setColorScheme: native.setColorScheme,
		}),
	}
})
vi.mock('lucide-react-native', () => ({ Paintbrush: () => null }))
vi.mock('~/lib/constants', () => ({
	SETTINGS_COLORS: { majorVisuals: '' },
	COLORS: {
		light: { background: { DEFAULT: '#ffffff' }, foreground: { DEFAULT: '#000000' } },
		dark: { background: { DEFAULT: '#000000' }, foreground: { DEFAULT: '#ffffff' } },
	},
}))
vi.mock('~/modules/readium', () => ({}))
vi.mock('~/components/book/reader/image/context', () => ({ BookmarkRef: undefined }))
vi.mock('~/lib/hooks', () => ({
	useTranslate: () => {
		const locale = usePreferencesStore((state) => state.locale)
		const dictionary = locale === 'ko-KR' ? koKR : enUS
		return {
			t: (key: string) =>
				`mobileApp.${key}`.split('.').reduce<unknown>((value, part) => {
					return (value as Record<string, unknown>)[part]
				}, dictionary),
		}
	},
}))
vi.mock('~/components/appSettings/AppSettingsRow', () => ({
	default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('~/components/ui/picker/picker', () => ({
	Picker: ({ value, options, onValueChange }: PickerProps) => (
		<select value={value} onChange={(event) => onValueChange(event.target.value)}>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	),
}))

const STORAGE_KEY = 'stump-mobile-preferences-store'
ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)
let container: HTMLDivElement
let root: Root
let theme: ReturnType<typeof useColorScheme>
let readerTheme: ReturnType<typeof useEpubTheme>

function ThemeScreen() {
	const currentTheme = useColorScheme()
	const currentReaderTheme = useEpubTheme()
	const { setColorScheme } = currentTheme
	useLayoutEffect(() => {
		theme = currentTheme
		readerTheme = currentReaderTheme
	}, [currentTheme, currentReaderTheme])
	useLayoutEffect(() => {
		setColorScheme(usePreferencesStore.getState().themePreference)
	}, [setColorScheme])
	return <AppTheme />
}

function renderTheme() {
	act(() => root.render(<ThemeScreen />))
	return container.querySelector('select')!
}

function selectTheme(value: 'light' | 'dark' | 'system') {
	act(() => {
		const picker = container.querySelector('select')!
		picker.value = value
		picker.dispatchEvent(new Event('change', { bubbles: true }))
	})
}

function changeSystemTheme(value: 'light' | 'dark') {
	act(() => {
		native.system = value
		native.listeners.forEach((notify) => notify())
	})
}

beforeEach(() => {
	Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
	usePreferencesStore.setState(usePreferencesStore.getInitialState(), true)
	useEpubThemesStore.setState(useEpubThemesStore.getInitialState(), true)
	native.storage.clear()
	native.system = 'light'
	native.preference = 'system'
	native.setColorScheme.mockClear()
	container = document.createElement('div')
	document.body.append(container)
	root = createRoot(container)
})

afterEach(() => {
	act(() => root.unmount())
	container.remove()
})

describe('app theme preference', () => {
	it('keeps System selected when the effective device appearance changes', () => {
		const picker = renderTheme()
		expect(picker.value).toBe('system')
		expect(theme.colorScheme).toBe('light')
		changeSystemTheme('dark')
		expect(picker.value).toBe('system')
		expect(theme.colorScheme).toBe('dark')
		expect(theme.isDarkColorScheme).toBe(true)
		changeSystemTheme('light')
		expect(picker.value).toBe('system')
		expect(theme.colorScheme).toBe('light')
	})

	it.each(['light', 'dark'] as const)(
		'keeps an explicit %s selection across device changes',
		(value) => {
			renderTheme()
			selectTheme(value)
			changeSystemTheme(value === 'light' ? 'dark' : 'light')
			expect(theme.colorScheme).toBe(value)
			expect(usePreferencesStore.getState().themePreference).toBe(value)
			expect(JSON.parse(native.storage.get(STORAGE_KEY)!).state.themePreference).toBe(value)
		},
	)

	it('restores system following after a manual selection', () => {
		renderTheme()
		selectTheme('dark')
		selectTheme('system')
		expect(native.setColorScheme).toHaveBeenLastCalledWith('system')
		expect(theme.colorScheme).toBe('light')
		changeSystemTheme('dark')
		expect(theme.colorScheme).toBe('dark')
		expect(container.querySelector('select')!.value).toBe('system')
	})

	it.each(['light', 'dark', 'system'] as const)(
		'restores a saved %s preference on startup',
		async (value) => {
			native.storage.set(
				STORAGE_KEY,
				JSON.stringify({ state: { themePreference: value }, version: 1 }),
			)
			await usePreferencesStore.persist.rehydrate()
			const picker = renderTheme()
			expect(picker.value).toBe(value)
			expect(native.setColorScheme).toHaveBeenCalledWith(value)
			expect(theme.colorScheme).toBe(value === 'system' ? 'light' : value)
		},
	)

	it('uses System for older saved preferences without resetting other settings', async () => {
		native.storage.set(
			STORAGE_KEY,
			JSON.stringify({ state: { locale: 'ko-KR', reduceAnimations: true }, version: 1 }),
		)
		await usePreferencesStore.persist.rehydrate()
		renderTheme()
		expect(usePreferencesStore.getState().themePreference).toBe('system')
		expect(usePreferencesStore.getState().locale).toBe('ko-KR')
		expect(usePreferencesStore.getState().reduceAnimations).toBe(true)
		expect(container.querySelector('option[value="system"]')!.textContent).toBe('시스템')
	})

	it('persists toggles as explicit selections', () => {
		renderTheme()
		act(() => theme.toggleColorScheme())
		expect(theme.colorScheme).toBe('dark')
		expect(usePreferencesStore.getState().themePreference).toBe('dark')
	})

	it('lets the default EPUB theme follow the effective app appearance', () => {
		renderTheme()
		expect(readerTheme.colors?.background).toBe('#ffffff')
		changeSystemTheme('dark')
		expect(readerTheme.colors?.background).toBe('#000000')
		expect(readerTheme.isDarkEpubTheme).toBe(true)
	})

	it('keeps an explicitly selected EPUB theme when the system appearance changes', () => {
		useEpubThemesStore.getState().selectTheme('Papyrus')
		renderTheme()
		const background = readerTheme.colors?.background
		changeSystemTheme('dark')
		expect(useEpubThemesStore.getState().selectedTheme).toBe('Papyrus')
		expect(readerTheme.colors?.background).toBe(background)
		expect(readerTheme.isDarkEpubTheme).toBe(false)
	})
})
