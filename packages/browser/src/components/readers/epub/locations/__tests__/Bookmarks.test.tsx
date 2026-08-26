import { Bookmark } from '@stump/graphql'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { EpubReaderControls, useEpubReaderContext } from '../../context'
import Bookmarks from '../Bookmarks'

jest.mock('@stump/i18n', () => ({
	...jest.requireActual('@stump/i18n'),
	useLocaleContext: () => ({ t: (key: string) => key }),
}))

jest.mock('../../context', () => ({
	...jest.requireActual('../../context'),
	useEpubReaderContext: jest.fn(),
}))

const mockedUseEpubReaderContext = jest.mocked(useEpubReaderContext)

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((res) => {
		resolve = res
	})
	return { promise, resolve }
}

function renderBookmarks(onGoToLocator: EpubReaderControls['onGoToLocator']) {
	const bookmark = {
		id: 'bookmark-1',
		previewContent: 'Saved paragraph',
		locator: {
			href: 'chapter.xhtml',
			type: 'application/xhtml+xml',
			chapterTitle: 'Chapter one',
			locations: { position: 1, progression: 0 },
		},
	} as Bookmark

	mockedUseEpubReaderContext.mockReturnValue({
		controls: { onGoToLocator } as EpubReaderControls,
		readerMeta: {
			bookEntity: {} as never,
			bookMeta: {
				annotations: [],
				bookmarks: { 'bookmark-1': bookmark },
				chapter: {},
				toc: [],
			},
			progress: null,
		},
	})

	const onLocationChanged = jest.fn()
	render(<Bookmarks onLocationChanged={onLocationChanged} />)
	return { onLocationChanged }
}

describe('Bookmarks', () => {
	beforeEach(() => jest.clearAllMocks())

	it('closes only after Readium confirms navigation', async () => {
		const navigation = deferred<boolean>()
		const onGoToLocator = jest.fn(() => navigation.promise)
		const { onLocationChanged } = renderBookmarks(onGoToLocator)

		fireEvent.click(screen.getByRole('button', { name: /chapter one/i }))

		expect(onGoToLocator).toHaveBeenCalledWith(
			expect.objectContaining({
				href: 'chapter.xhtml',
				locations: expect.objectContaining({ progression: 0 }),
			}),
		)
		expect(onLocationChanged).not.toHaveBeenCalled()

		navigation.resolve(true)
		await waitFor(() => expect(onLocationChanged).toHaveBeenCalledTimes(1))
	})

	it('stays open when navigation fails', async () => {
		const onGoToLocator = jest.fn().mockResolvedValue(false)
		const { onLocationChanged } = renderBookmarks(onGoToLocator)

		fireEvent.click(screen.getByRole('button', { name: /chapter one/i }))

		await waitFor(() => expect(onGoToLocator).toHaveBeenCalledTimes(1))
		expect(onLocationChanged).not.toHaveBeenCalled()
	})
})
