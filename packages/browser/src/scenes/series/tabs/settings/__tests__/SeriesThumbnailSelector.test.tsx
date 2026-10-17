import '@/__mocks__/pointerCapture'
import '@/__mocks__/resizeObserver'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'

import SeriesThumbnailSelector from '../SeriesThumbnailSelector'

vi.mock('@stump/client', () => ({
	useGraphQLMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useSDK: () => ({
		sdk: {
			axios: { get: vi.fn() },
			media: { bookPageURL: vi.fn() },
		},
	}),
}))

vi.mock('@stump/graphql', async () => {
	const actual = await vi.importActual<typeof import('@stump/graphql')>('@stump/graphql')

	return {
		...actual,
		useFragment: (_fragment: unknown, fragment: unknown) => fragment,
	}
})

vi.mock('@stump/i18n', () => ({
	useCreateTranslate: () => ({ t: (s: string) => s, translate: (s: string) => s }),
}))

vi.mock('@/components/entity', () => ({
	EntityCard: () => <div />,
}))

vi.mock('@/components/thumbnail/EditThumbnailDropdown', () => ({
	default: ({ onChooseSelector }: { onChooseSelector: () => void }) => (
		<button onClick={onChooseSelector}>Choose thumbnail</button>
	),
}))

vi.mock('../../../../book/settings/BookPageGrid', () => ({
	default: () => <div />,
}))

vi.mock('../SeriesBookGrid', () => ({
	default: () => <div />,
}))

describe('SeriesThumbnailSelector', () => {
	it('renders localized selector content after opening the dialog', () => {
		render(
			<QueryClientProvider client={new QueryClient()}>
				<SeriesThumbnailSelector
					fragment={
						{ id: 'series-1', thumbnail: { url: 'https://example.com/thumbnail.jpg' } } as any
					}
				/>
			</QueryClientProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Choose thumbnail' }))

		expect(screen.getByText('thumbnailSelector.title')).toBeInTheDocument()
		expect(screen.getByText('thumbnailSelector.descriptions.chooseSeriesBook')).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'thumbnailSelector.actions.confirmSelection' }),
		).toBeInTheDocument()
	})
})
