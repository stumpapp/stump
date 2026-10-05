import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ThemePreference } from '~/stores/user'

import { useColorScheme } from '../useColorScheme'

const mocks = vi.hoisted(() => ({
	colorScheme: 'light' as 'light' | 'dark' | undefined,
	themePreference: 'system' as ThemePreference,
	setColorScheme: vi.fn(),
	patch: vi.fn(),
}))

vi.mock('nativewind', () => ({
	useColorScheme: () => ({
		colorScheme: mocks.colorScheme,
		setColorScheme: mocks.setColorScheme,
	}),
}))
vi.mock('react', () => ({ useCallback: (callback: unknown) => callback }))
vi.mock('~/stores/user', () => ({
	usePreferencesStore: (
		selector: (state: { themePreference: ThemePreference; patch: typeof mocks.patch }) => unknown,
	) => selector({ themePreference: mocks.themePreference, patch: mocks.patch }),
}))

beforeEach(() => {
	vi.clearAllMocks()
	mocks.colorScheme = 'light'
	mocks.themePreference = 'system'
})

describe('useColorScheme', () => {
	it.each(['light', 'dark'] as const)(
		'returns the effective %s appearance while keeping the System preference',
		(colorScheme) => {
			mocks.colorScheme = colorScheme
			const theme = useColorScheme()
			expect(theme.colorScheme).toBe(colorScheme)
			expect(theme.isDarkColorScheme).toBe(colorScheme === 'dark')
			expect(theme.themePreference).toBe('system')
		},
	)

	it.each(['light', 'dark', 'system'] as const)('returns the stored %s preference', (value) => {
		mocks.themePreference = value
		expect(useColorScheme().themePreference).toBe(value)
		expect(mocks.setColorScheme).not.toHaveBeenCalled()
		expect(mocks.patch).not.toHaveBeenCalled()
	})

	it.each(['light', 'dark', 'system'] as const)('applies and persists a %s selection', (value) => {
		useColorScheme().setColorScheme(value)
		expect(mocks.setColorScheme).toHaveBeenCalledExactlyOnceWith(value)
		expect(mocks.patch).toHaveBeenCalledExactlyOnceWith({ themePreference: value })
	})

	it.each([
		['light', 'dark'],
		['dark', 'light'],
	] as const)('toggles an effective %s appearance to an explicit %s selection', (current, next) => {
		mocks.colorScheme = current
		useColorScheme().toggleColorScheme()
		expect(mocks.setColorScheme).toHaveBeenCalledExactlyOnceWith(next)
		expect(mocks.patch).toHaveBeenCalledExactlyOnceWith({ themePreference: next })
	})

	it('preserves the fallback when NativeWind has no effective appearance', () => {
		mocks.colorScheme = undefined
		const theme = useColorScheme()
		expect(theme.colorScheme).toBe('dark')
		expect(theme.isDarkColorScheme).toBe(false)
		expect(theme.themePreference).toBe('system')
	})
})
