import '@/__mocks__/resizeObserver'
import '@/__mocks__/pointerCapture'

import type { EpubSearchResponse, EpubSearchResult } from '@stump/sdk'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { EpubReaderControls, useEpubReaderContext } from '../../context'
import { searchResultToReaderLocator } from '../../readium/locator'
import SearchCommand from '../SearchCommand'

jest.mock('@stump/i18n', () => ({
	...jest.requireActual('@stump/i18n'),
	useLocaleContext: () => ({
		t: (key: string, options?: { position?: number }) => {
			if (key === 'epubReader.search.placeholder') {
				return 'Enter a query and press enter to search'
			}
			if (key === 'epubReader.search.loadMore') {
				return 'Load more results'
			}
			if (key === 'epubReader.search.section') {
				return `Section ${options?.position}`
			}

			return key
		},
	}),
}))

jest.mock('../../context', () => ({
	...jest.requireActual('../../context'),
	useEpubReaderContext: jest.fn(),
}))

const mockedUseEpubReaderContext = jest.mocked(useEpubReaderContext)

let resultId = 0
function buildResult(
	opts: {
		spineIndex?: number
		chapterTitle?: string | null
		before?: string
		highlight?: string
		after?: string
	} = {},
): EpubSearchResult {
	const id = ++resultId
	return {
		excerpt: `excerpt-${id}`,
		spineIndex: opts.spineIndex ?? 0,
		locator: {
			href: `/resource/chapter-${id}.xhtml`,
			type: 'application/xhtml+xml',
			chapterTitle: opts.chapterTitle === undefined ? `Chapter ${id}` : opts.chapterTitle,
			locations: { position: id, progression: 0, totalProgression: 0 },
			text: {
				before: opts.before ?? `before-${id} `,
				highlight: opts.highlight ?? `match-${id}`,
				after: opts.after ?? ` after-${id}`,
			},
		},
	}
}

function buildResponse(
	results: EpubSearchResult[],
	overrides: Partial<EpubSearchResponse> = {},
): EpubSearchResponse {
	return {
		query: 'query',
		results,
		nextCursor: null,
		truncated: false,
		...overrides,
	}
}

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (reason?: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

function mockControls(overrides: Partial<EpubReaderControls> = {}) {
	mockedUseEpubReaderContext.mockReturnValue({
		controls: {
			fullscreen: false,
			visible: false,
			setFullscreen: jest.fn(),
			setVisible: jest.fn(),
			onMouseEnterControls: jest.fn(),
			onMouseLeaveControls: jest.fn(),
			onLinkClick: jest.fn(),
			onPaginateForward: jest.fn(),
			onPaginateBackward: jest.fn(),
			jumpToSection: jest.fn(),
			onGoToLocator: jest.fn(),
			getLocatorPreviewText: jest.fn(() => null),
			...overrides,
		},
		readerMeta: {
			bookEntity: {} as never,
			bookMeta: null,
			progress: null,
		},
	})
}

/** Opens the dialog, types a query, and submits it with Enter. */
function search(query: string) {
	fireEvent.click(screen.getByRole('button'))
	const input = screen.getByPlaceholderText(/enter a query/i)
	fireEvent.change(input, { target: { value: query } })
	fireEvent.keyDown(document, { key: 'Enter' })
}

describe('SearchCommand', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		resultId = 0
	})

	it('renders nothing when searchBook is unavailable', () => {
		mockControls()
		expect(render(<SearchCommand />).container).toBeEmptyDOMElement()
	})

	it('navigates via onGoToLocator when a result is clicked', async () => {
		const result = buildResult({ before: 'the ', highlight: 'quick', after: ' fox' })
		const searchBook = jest.fn().mockResolvedValue(buildResponse([result]))
		const onGoToLocator = jest.fn()
		mockControls({ searchBook, onGoToLocator })

		render(<SearchCommand />)
		search('quick')

		const match = await screen.findByText('quick')
		fireEvent.click(match)

		expect(onGoToLocator).toHaveBeenCalledTimes(1)
		expect(onGoToLocator).toHaveBeenCalledWith(searchResultToReaderLocator(result))

		// The dialog closes after navigating.
		await waitFor(() => {
			expect(screen.queryByPlaceholderText(/enter a query/i)).not.toBeInTheDocument()
		})
	})

	it('appends results to the existing list when loading more via nextCursor', async () => {
		const firstResult = buildResult({ highlight: 'alpha' })
		const secondResult = buildResult({ highlight: 'beta' })
		const searchBook = jest
			.fn()
			.mockResolvedValueOnce(buildResponse([firstResult], { nextCursor: 'cursor-2' }))
			.mockResolvedValueOnce(buildResponse([secondResult], { nextCursor: null }))
		mockControls({ searchBook })

		render(<SearchCommand />)
		search('a')

		await screen.findByText('alpha')
		expect(screen.getByText('Load more results')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Load more results'))

		await screen.findByText('beta')
		expect(screen.getByText('alpha')).toBeInTheDocument()

		expect(searchBook).toHaveBeenCalledTimes(2)
		expect(searchBook).toHaveBeenNthCalledWith(
			2,
			'a',
			expect.objectContaining({ cursor: 'cursor-2' }),
		)
		expect(screen.queryByText('Load more results')).not.toBeInTheDocument()
	})

	it('ignores a stale response superseded by a newer search', async () => {
		const staleResponse = deferred<EpubSearchResponse>()
		const freshResponse = deferred<EpubSearchResponse>()
		const searchBook = jest
			.fn()
			.mockReturnValueOnce(staleResponse.promise)
			.mockReturnValueOnce(freshResponse.promise)
		mockControls({ searchBook })

		render(<SearchCommand />)

		fireEvent.click(screen.getByRole('button'))
		const input = screen.getByPlaceholderText(/enter a query/i)

		fireEvent.change(input, { target: { value: 'first' } })
		fireEvent.keyDown(document, { key: 'Enter' })

		fireEvent.change(input, { target: { value: 'second' } })
		fireEvent.keyDown(document, { key: 'Enter' })

		expect(searchBook).toHaveBeenCalledTimes(2)

		// The newer request resolves first...
		freshResponse.resolve(buildResponse([buildResult({ highlight: 'fresh-result' })]))
		await screen.findByText('fresh-result')

		// ...then the stale (older) request resolves and must not overwrite the newer results.
		staleResponse.resolve(buildResponse([buildResult({ highlight: 'stale-result' })]))
		await waitFor(() => {
			expect(screen.queryByText('stale-result')).not.toBeInTheDocument()
		})
		expect(screen.getByText('fresh-result')).toBeInTheDocument()
	})

	it('renders punctuation in server-provided text parts literally, without regex processing', async () => {
		const result = buildResult({
			before: 'He said, "What (is) this*thing?" ',
			highlight: '$100.00',
			after: ' — really?',
		})
		const searchBook = jest.fn().mockResolvedValue(buildResponse([result]))
		mockControls({ searchBook })

		render(<SearchCommand />)
		search('$100.00')

		await screen.findByText('$100.00')

		// The dialog content is portaled — assert against the document body rather than
		// the render container.
		expect(document.body.textContent).toContain(
			'He said, "What (is) this*thing?" $100.00 — really?',
		)
	})

	it('groups results by chapter title', async () => {
		const chapterOneResult = buildResult({ chapterTitle: 'Chapter One', highlight: 'one' })
		const chapterTwoResult = buildResult({ chapterTitle: 'Chapter Two', highlight: 'two' })
		const searchBook = jest
			.fn()
			.mockResolvedValue(buildResponse([chapterOneResult, chapterTwoResult]))
		mockControls({ searchBook })

		render(<SearchCommand />)
		search('chapter')

		await screen.findByText('one')

		expect(screen.getByText('Chapter One')).toBeInTheDocument()
		expect(screen.getByText('Chapter Two')).toBeInTheDocument()
	})
})
