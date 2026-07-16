import { isEbookExtension, isEbookReadProgress, readProgressPercent } from '../ebookProgress'

describe('ebookProgress', () => {
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

	it('preserves legacy epubcfi + percentage behavior', () => {
		expect(
			readProgressPercent(
				{
					epubcfi: 'epubcfi(/6/4!/4)',
					percentageCompleted: 0.15,
				},
				100,
			),
		).toBe(15)
	})

	it('falls back to page-based progress for comics', () => {
		expect(
			readProgressPercent(
				{
					page: 25,
				},
				100,
				'cbz',
			),
		).toBe(25)
	})
})
