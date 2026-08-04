import { isEbookExtension, isEbookReadProgress, readProgressPercent } from '../readingProgress'

describe('readingProgress', () => {
	it('detects epub extensions', () => {
		expect(isEbookExtension('epub')).toBe(true)
		expect(isEbookExtension('cbz')).toBe(false)
	})

	it('treats locator-only progress as ebook', () => {
		expect(
			isEbookReadProgress({
				percentageCompleted: 0.42,
				locator: { href: 'chapter1.xhtml' },
			}),
		).toBe(true)
	})

	it('uses percentage for locator-only Readium sessions', () => {
		expect(
			readProgressPercent(
				{
					percentageCompleted: 0.42,
					locator: { href: 'chapter1.xhtml' },
				},
				0,
				'epub',
			),
		).toBe(42)
	})

	it('falls back to page-based progress for comics', () => {
		expect(readProgressPercent({ page: 25 }, 100, 'cbz')).toBe(25)
	})
})
