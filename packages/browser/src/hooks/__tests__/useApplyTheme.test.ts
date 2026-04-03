import { SupportedFont } from '@stump/graphql'
import { renderHook } from '@testing-library/react'
import { useMediaMatch } from 'rooks'

import { useApplyTheme } from '../useApplyTheme'
import { DARK_THEMES } from '../useTheme'

jest.mock('rooks', () => ({
	useMediaMatch: jest.fn(),
}))

describe('useApplyTheme', () => {
	afterEach(() => {
		const meta = document.querySelector('meta[name="color-scheme"]')
		if (meta) {
			meta.remove()
		}
		document.documentElement.className = ''
	})

	describe('Dark theme meta tag creation', () => {
		it('should create meta tag when theme is literally dark', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			renderHook(() => useApplyTheme({ appTheme: 'dark', appFont: SupportedFont.Inter }))

			const meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeTruthy()
			expect(meta?.getAttribute('name')).toBe('color-scheme')
			expect(meta?.getAttribute('content')).toBe('dark')
		})

		it('should create meta tag when theme is a dark variant', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			for (const appTheme of DARK_THEMES) {
				renderHook(() => useApplyTheme({ appTheme, appFont: SupportedFont.Inter }))

				const meta = document.querySelector('meta[name="color-scheme"]')
				expect(meta).toBeTruthy()
				expect(meta?.getAttribute('content')).toBe('dark')
			}
		})

		it('should create meta tag when theme is system and user prefers dark', () => {
			jest.mocked(useMediaMatch).mockReturnValue(true)

			renderHook(() => useApplyTheme({ appTheme: 'system', appFont: SupportedFont.Inter }))

			const meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeTruthy()
			expect(meta?.getAttribute('content')).toBe('dark')
		})

		it('should not create meta tag when theme is light', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			renderHook(() => useApplyTheme({ appTheme: 'light', appFont: SupportedFont.Inter }))

			const meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeFalsy()
		})

		it('should not create meta tag when theme is system and user prefers light', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			renderHook(() => useApplyTheme({ appTheme: 'system', appFont: SupportedFont.Inter }))

			const meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeFalsy()
		})
	})

	describe('Meta tag behavior on theme changes', () => {
		it('should create meta tag when switching from light to dark theme', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			const { rerender } = renderHook(
				({ theme }) => useApplyTheme({ appTheme: theme, appFont: SupportedFont.Inter }),
				{ initialProps: { theme: 'light' } },
			)

			expect(document.querySelector('meta[name="color-scheme"]')).toBeFalsy()

			rerender({ theme: 'dark' })

			const meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeTruthy()
			expect(meta?.getAttribute('content')).toBe('dark')
		})

		it('should remove meta tag when switching from dark to light theme', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			const { rerender } = renderHook(
				({ theme }) => useApplyTheme({ appTheme: theme, appFont: SupportedFont.Inter }),
				{ initialProps: { theme: 'dark' } },
			)

			let meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeTruthy()
			expect(meta?.getAttribute('content')).toBe('dark')

			rerender({ theme: 'light' })

			meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeFalsy()
		})

		it('should handle system theme with changing user preference', () => {
			jest.mocked(useMediaMatch).mockReturnValue(false)

			const { rerender } = renderHook(() =>
				useApplyTheme({ appTheme: 'system', appFont: SupportedFont.Inter }),
			)

			expect(document.querySelector('meta[name="color-scheme"]')).toBeFalsy()

			jest.mocked(useMediaMatch).mockReturnValue(true)
			rerender()

			const meta = document.querySelector('meta[name="color-scheme"]')
			expect(meta).toBeTruthy()
			expect(meta?.getAttribute('content')).toBe('dark')
		})
	})
})
