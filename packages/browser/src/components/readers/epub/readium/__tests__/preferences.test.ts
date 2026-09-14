import { ReadingMode } from '@stump/graphql'

import { bookPreferencesToEpubPreferences, resolveEffectiveColumnCount } from '../preferences'

describe('resolveEffectiveColumnCount', () => {
	it('honors explicit column counts regardless of stage width', () => {
		expect(resolveEffectiveColumnCount(1, 2000)).toBe(1)
		expect(resolveEffectiveColumnCount(2, 100)).toBe(2)
	})

	it('resolves auto to 1 column below the two-column breakpoint', () => {
		expect(resolveEffectiveColumnCount('auto', 899)).toBe(1)
	})

	it('resolves auto to 2 columns at/above the two-column breakpoint', () => {
		expect(resolveEffectiveColumnCount('auto', 900)).toBe(2)
		expect(resolveEffectiveColumnCount('auto', 1400)).toBe(2)
	})

	it('conservatively resolves auto to 1 column when stage width is unknown', () => {
		expect(resolveEffectiveColumnCount('auto', undefined)).toBe(1)
	})

	it('treats an unset column count preference as auto', () => {
		expect(resolveEffectiveColumnCount(undefined, 1400)).toBe(2)
		expect(resolveEffectiveColumnCount(undefined, 400)).toBe(1)
	})
})

describe('bookPreferencesToEpubPreferences', () => {
	it('clears columnCount with null (not undefined) in continuous scroll mode', () => {
		const preferences = bookPreferencesToEpubPreferences({
			readingMode: ReadingMode.ContinuousVertical,
			columnCount: 2,
			stageWidth: 1400,
		})

		expect(preferences.scroll).toBe(true)
		expect(preferences.columnCount).toBeNull()
		expect(preferences.columnCount).not.toBeUndefined()
	})

	it('resolves an explicit column count in paginated mode', () => {
		const preferences = bookPreferencesToEpubPreferences({
			readingMode: ReadingMode.Paged,
			columnCount: 1,
			stageWidth: 1400,
		})

		expect(preferences.scroll).toBe(false)
		expect(preferences.columnCount).toBe(1)
	})

	it('resolves auto column count from stage width in paginated mode', () => {
		const wide = bookPreferencesToEpubPreferences({
			readingMode: ReadingMode.Paged,
			columnCount: 'auto',
			stageWidth: 1400,
		})
		const narrow = bookPreferencesToEpubPreferences({
			readingMode: ReadingMode.Paged,
			columnCount: 'auto',
			stageWidth: 400,
		})

		expect(wide.columnCount).toBe(2)
		expect(narrow.columnCount).toBe(1)
	})

	it('maps pageMargins to pageGutter only in paginated mode', () => {
		const paginated = bookPreferencesToEpubPreferences({
			readingMode: ReadingMode.Paged,
			pageMargins: 1.5,
		})
		const continuous = bookPreferencesToEpubPreferences({
			readingMode: ReadingMode.ContinuousVertical,
			pageMargins: 1.5,
		})

		expect(paginated.pageGutter).toBeGreaterThan(0)
		expect(continuous.pageGutter).toBeUndefined()
	})

	it('maps fontSize (px) to a Readium scale factor', () => {
		const preferences = bookPreferencesToEpubPreferences({ fontSize: 16 })
		expect(preferences.fontSize).toBeCloseTo(1, 5)
	})

	it('applies a dark palette when isDarkVariant is true', () => {
		const preferences = bookPreferencesToEpubPreferences({ isDarkVariant: true })
		expect(preferences.backgroundColor).toBe('#161719')
		expect(preferences.textColor).toBe('#E8EDF4')
	})
})
