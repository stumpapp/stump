import { ReadingDirection } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import { usePaths } from '@/paths'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { IImageBaseReaderContext, useImageBaseReaderContext } from '../../context'
import NextInSeries from '../NextInSeries'

vi.mock('rooks', () => ({
	useMediaMatch: vi.fn(),
}))

vi.mock('@/components/entity', () => ({
	EntityImage: ({ src }: { src: string }) => <img src={src} alt="" />,
}))

vi.mock('@/paths', () => ({
	usePaths: vi.fn(),
}))

vi.mock('@/scenes/book/reader/useBookPreferences', () => ({
	useBookPreferences: vi.fn(),
}))

vi.mock('../../context', async () => ({
	...(await vi.importActual<typeof import('../../context')>('../../context')),
	useImageBaseReaderContext: vi.fn(),
}))

const createReaderContext = (): IImageBaseReaderContext => ({
	book: {
		id: 'current-book',
		nextInSeries: {
			nodes: [
				{
					id: 'next-book',
					name: 'Next Book',
					thumbnail: { url: '/next-book.jpg' },
				},
			],
		},
		pages: 10,
	} as IImageBaseReaderContext['book'],
	currentPage: 10,
	getPageUrl: vi.fn(),
	imageSizes: {},
	pageSets: [],
	setCurrentPage: vi.fn(),
	setPageSize: vi.fn(),
	timer: {
		getCurrentTime: vi.fn(() => 0),
		pause: vi.fn(),
		reset: vi.fn(),
		resume: vi.fn(),
	},
	toggleToolbar: vi.fn(),
})

describe('NextInSeries', () => {
	beforeEach(() => {
		vi.mocked(useMediaMatch).mockReturnValue(true)
		vi.mocked(usePaths).mockReturnValue({
			bookReader: (id: string) => `/books/${id}/read`,
		} as ReturnType<typeof usePaths>)
		vi.mocked(useBookPreferences).mockReturnValue({
			bookPreferences: { readingDirection: ReadingDirection.Ltr },
		} as ReturnType<typeof useBookPreferences>)
		vi.mocked(useImageBaseReaderContext).mockReturnValue(createReaderContext())
	})

	it('links to the next book with localized copy and can be dismissed', async () => {
		const user = userEvent.setup()
		const { container } = render(
			<MemoryRouter>
				<LocaleProvider locale="en-US">
					<NextInSeries />
				</LocaleProvider>
			</MemoryRouter>,
		)

		const trigger = container.querySelector('.cursor-pointer')
		expect(trigger).not.toBeNull()
		await user.click(trigger!)

		expect(await screen.findByText('Next Up:')).toBeInTheDocument()
		expect(screen.getByText('Next Book')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute(
			'href',
			'/books/next-book/read',
		)

		await user.click(screen.getByRole('button'))
		expect(screen.queryByText('Next Book')).not.toBeInTheDocument()
	})
})
