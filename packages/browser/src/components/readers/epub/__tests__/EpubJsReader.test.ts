import paths from '@/paths'

import { resolveInitialEpubCfi } from '../EpubJsReader'

describe('EPUB initial location', () => {
	it('keeps resume behavior unless the URL requests the beginning', () => {
		const startUrl = new URL(
			paths.bookReader('book-id', { isEpub: true, startFromBeginning: true }),
			'https://stump.test',
		)
		expect(startUrl.searchParams.get('start')).toBe('true')
		expect(paths.bookReader('book-id', { isEpub: true })).not.toContain('start=true')

		const cfiFromPercentage = jest.fn((percentage: number) => `percentage:${percentage}`)
		const savedProgress = { epubcfi: 'saved-cfi', percentageCompleted: 0.5 }
		expect(resolveInitialEpubCfi(savedProgress, false, cfiFromPercentage)).toBeUndefined()
		expect(cfiFromPercentage).not.toHaveBeenCalled()
		expect(resolveInitialEpubCfi(savedProgress, true, cfiFromPercentage)).toBe('saved-cfi')
		expect(resolveInitialEpubCfi({ percentageCompleted: 0.5 }, true, cfiFromPercentage)).toBe(
			'percentage:0.5',
		)
	})
})
