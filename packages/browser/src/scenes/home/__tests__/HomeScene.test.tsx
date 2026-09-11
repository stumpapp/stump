import '@/__mocks__/resizeObserver'

import { SDKContext, StumpClientContext } from '@stump/client'
import { FilterableArrangementEntity } from '@stump/graphql'
import { LocaleProvider } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropsWithChildren, Suspense } from 'react'
import { MemoryRouter } from 'react-router'

import HomeArrangementPreference from '@/scenes/settings/app/preferences/HomeArrangementPreference'

import { HomeSection, toHomeSectionInput, useUpdateHomeArrangement } from '../arrangement'
import HomeScene, { usePrefetchHomeScene } from '../HomeScene'

const prefetch = vi.hoisted(() => ({
	reading: vi.fn(),
	deck: vi.fn(),
	books: vi.fn(),
	series: vi.fn(),
}))
vi.mock('../ContinueReading', () => ({
	default: () => <h2>Reading section</h2>,
	usePrefetchContinueReading: () => prefetch.reading,
}))
vi.mock('../OnDeck', () => ({
	default: () => <h2>Deck section</h2>,
	usePrefetchOnDeck: () => prefetch.deck,
}))
vi.mock('../RecentlyAddedMedia', () => ({
	default: () => <h2>Books section</h2>,
	usePrefetchRecentlyAddedMedia: () => prefetch.books,
}))
vi.mock('../RecentlyAddedSeries', () => ({
	default: () => <h2>Series section</h2>,
	usePrefetchRecentlyAddedSeries: () => prefetch.series,
}))
vi.mock('../NoLibraries', () => ({ default: () => <p>No libraries</p> }))

const original: HomeSection[] = [
	{ visible: true, config: { __typename: 'InProgressBooks', name: null } },
	{ visible: true, config: { __typename: 'OnDeckBooks', name: null } },
	{
		visible: true,
		config: {
			__typename: 'RecentlyAdded',
			entity: FilterableArrangementEntity.Books,
			name: null,
		},
	},
	{
		visible: true,
		config: {
			__typename: 'RecentlyAdded',
			entity: FilterableArrangementEntity.Series,
			name: null,
		},
	},
]
const response = (sections: HomeSection[]) => ({
	me: { preferences: { homeArrangement: { sections } } },
})

function setup(initial = original, libraries = 1) {
	const sdk = new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' })
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	})
	const saved = [original[3]!, original[1]!, original[0]!, { ...original[2]!, visible: false }]
	const execute = vi.spyOn(sdk, 'execute').mockImplementation(async (document) => {
		const query = document.toString()
		if (query.includes('mutation UpdateHomeArrangement'))
			return { updateHomeArrangement: { sections: saved } }
		if (query.includes('query HomeArrangementPreferences')) return response(initial)
		if (query.includes('query HomeSceneQuery')) return { numberOfLibraries: libraries }
		throw new Error('Unexpected query')
	})
	function Wrapper({ children }: PropsWithChildren) {
		return (
			<SDKContext.Provider value={{ sdk, setSDK: vi.fn() }}>
				<StumpClientContext.Provider value={{}}>
					<QueryClientProvider client={client}>
						<MemoryRouter>
							<LocaleProvider locale="en-US">
								<Suspense fallback={<p>Loading</p>}>{children}</Suspense>
							</LocaleProvider>
						</MemoryRouter>
					</QueryClientProvider>
				</StumpClientContext.Provider>
			</SDKContext.Provider>
		)
	}
	return { sdk, client, execute, Wrapper, saved }
}

beforeEach(() => vi.clearAllMocks())

describe('HomeScene arrangement', () => {
	it('renders saved order and never mounts hidden sections', async () => {
		const { Wrapper } = setup([
			original[3]!,
			{ ...original[2]!, visible: false },
			original[1]!,
			original[0]!,
		])
		render(<HomeScene />, { wrapper: Wrapper })
		await screen.findByText('Series section')
		expect(screen.getAllByRole('heading').map((node) => node.textContent)).toEqual([
			'Series section',
			'Deck section',
			'Reading section',
		])
		expect(screen.queryByText('Books section')).not.toBeInTheDocument()
	})

	it('offers a recovery link when all sections are hidden', async () => {
		const { Wrapper } = setup(original.map((section) => ({ ...section, visible: false })))
		render(<HomeScene />, { wrapper: Wrapper })
		expect(await screen.findByText('All home sections are hidden.')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Customize your home page' })).toHaveAttribute(
			'href',
			'/settings/preferences',
		)
		expect(screen.queryByRole('heading')).not.toBeInTheDocument()
	})

	it('keeps the no-library experience', async () => {
		const { Wrapper } = setup(original, 0)
		render(<HomeScene />, { wrapper: Wrapper })
		expect(await screen.findByText('No libraries')).toBeInTheDocument()
		expect(screen.queryByText('Reading section')).not.toBeInTheDocument()
	})

	it('applies the successful mutation response to the mounted home and its cache', async () => {
		const user = userEvent.setup()
		const { Wrapper, client, execute, saved } = setup()
		render(
			<>
				<HomeScene />
				<HomeArrangementPreference />
			</>,
			{ wrapper: Wrapper },
		)
		await screen.findByText('Books section')
		await user.click(await screen.findByRole('button', { name: 'Edit' }))
		await user.click(screen.getByRole('button', { name: 'Recently added books' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
			'Series section',
			'Deck section',
			'Reading section',
		])
		expect(screen.queryByText('Books section')).not.toBeInTheDocument()
		expect(client.getQueryData(['homeArrangement', undefined])).toEqual(response(saved))
		expect(
			execute.mock.calls.filter(([document]) =>
				document.toString().includes('mutation UpdateHomeArrangement'),
			),
		).toHaveLength(1)
	})

	it('prefetches only the sections enabled in the server preferences', async () => {
		const { Wrapper } = setup(
			original.map((section, index) => ({ ...section, visible: index < 2 })),
		)
		const { result } = renderHook(usePrefetchHomeScene, { wrapper: Wrapper })
		await act(async () => {
			await result.current()
		})
		expect(prefetch.reading).toHaveBeenCalledOnce()
		expect(prefetch.deck).toHaveBeenCalledOnce()
		expect(prefetch.books).not.toHaveBeenCalled()
		expect(prefetch.series).not.toHaveBeenCalled()
	})
	it('does not let an older in-flight read overwrite a successful save', async () => {
		const { Wrapper, client, saved } = setup()
		const key = ['homeArrangement', undefined]
		client.setQueryData(key, response(original))
		let finishRead!: (value: ReturnType<typeof response>) => void
		const pendingRead = client
			.fetchQuery({
				queryKey: key,
				queryFn: () =>
					new Promise<ReturnType<typeof response>>((resolve) => {
						finishRead = resolve
					}),
			})
			.catch(() => undefined)
		const { result } = renderHook(useUpdateHomeArrangement, { wrapper: Wrapper })
		await act(async () => {
			await result.current.mutateAsync({ input: { sections: original.map(toHomeSectionInput) } })
		})
		finishRead(response(original))
		await pendingRead
		expect(client.getQueryData(key)).toEqual(response(saved))
	})
})
