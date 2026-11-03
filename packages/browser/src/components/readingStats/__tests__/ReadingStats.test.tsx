import '@/__mocks__/resizeObserver'

import { SDKContext, StumpClientContext } from '@stump/client'
import { LocaleProvider } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router'

import RangedStats from '../RangedStats'
import Streaks from '../Streaks'

const stats = (sessionCount: number) => ({
	myReadingStats: {
		range: { start: '2026-01-01', end: '2026-01-03' },
		totals: {
			totalSeconds: sessionCount ? 5400 : 0,
			sessionCount,
			finishedCount: sessionCount ? 1 : 0,
			activeDayCount: sessionCount ? 2 : 0,
		},
		dailyActivity: sessionCount
			? [
					{ date: '2026-01-01', totalSeconds: 3600, sessionCount: 1 },
					{ date: '2026-01-03', totalSeconds: 1800, sessionCount: 1 },
				]
			: [],
		dayOfWeek: Array.from({ length: 7 }, (_, index) => ({
			isoWeekday: index + 1,
			averageSeconds: sessionCount && index === 3 ? 1800 : 0,
		})),
		timeToFinish: sessionCount
			? [{ libraryType: 'COMIC', sampleSize: 2, medianActiveSeconds: 1800 }]
			: [],
	},
})

function setup(handler: (query: string) => unknown) {
	const sdk = new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' })
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const execute = vi
		.spyOn(sdk, 'execute')
		.mockImplementation(async (document) => handler(document.toString()) as never)

	function Wrapper({ children }: PropsWithChildren) {
		return (
			<SDKContext.Provider value={{ sdk, setSDK: vi.fn() }}>
				<StumpClientContext.Provider value={{}}>
					<QueryClientProvider client={client}>
						<MemoryRouter>
							<LocaleProvider locale="en-US">{children}</LocaleProvider>
						</MemoryRouter>
					</QueryClientProvider>
				</StumpClientContext.Provider>
			</SDKContext.Provider>
		)
	}

	return { execute, Wrapper }
}

describe('Streaks', () => {
	it('should render the current and longest streaks', async () => {
		const { Wrapper } = setup(() => ({ myReadingStreaks: { currentDays: 1, longestDays: 12 } }))
		render(<Streaks />, { wrapper: Wrapper })

		expect(await screen.findByText(/^1 day$/i)).toBeInTheDocument()
		expect(screen.getByText(/^12 days$/i)).toBeInTheDocument()
	})
})

describe('RangedStats', () => {
	it('should render the stats for the default (year) range', async () => {
		const { Wrapper, execute } = setup(() => stats(2))
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/you read on 2 days/i)).toBeInTheDocument()
		expect(screen.getByText(/books finished/i)).toBeInTheDocument()
		expect(screen.getByText(/based on 2 books/i)).toBeInTheDocument()
		expect(screen.getByRole('img', { name: 'Jan 1 - Jan 3' })).toBeInTheDocument()
		expect(execute).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ range: { start: expect.stringMatching(/-01-01$/) } }),
		)
	})

	it('should show an empty state when there was no reading in the range', async () => {
		const { Wrapper } = setup(() => stats(0))
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/no reading activity/i)).toBeInTheDocument()
		expect(screen.queryByText(/books finished/i)).not.toBeInTheDocument()
	})

	it('should request an unbounded range for lifetime', async () => {
		const user = userEvent.setup()
		const { Wrapper, execute } = setup(() => stats(2))
		render(<RangedStats />, { wrapper: Wrapper })

		await user.selectOptions(await screen.findByLabelText(/stats range/i), 'lifetime')

		await waitFor(() => expect(execute).toHaveBeenLastCalledWith(expect.anything(), { range: {} }))
	})

	it('should show an error with a retry when the stats fail to load', async () => {
		const user = userEvent.setup()
		let fail = true
		const { Wrapper } = setup(() => {
			if (fail) throw new Error('nope')
			return stats(2)
		})
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/your reading stats could not be loaded/i)).toBeInTheDocument()

		fail = false
		await user.click(screen.getByRole('button', { name: /try again/i }))

		expect(await screen.findByText(/books finished/i)).toBeInTheDocument()
	})
})
