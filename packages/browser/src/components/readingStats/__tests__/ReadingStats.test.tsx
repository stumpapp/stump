import '@/__mocks__/resizeObserver'
import '@/__mocks__/pointerCapture'

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

const history = (sessionCount: number) => ({ myReadingStats: { totals: { sessionCount } } })

type Handlers = {
	ranged: () => unknown
	history?: () => unknown
}

function setup(handlers: Handlers | (() => unknown)) {
	const { ranged, history: hasHistory } =
		typeof handlers === 'function' ? { ranged: handlers, history: undefined } : handlers

	const sdk = new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' })
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const execute = vi.spyOn(sdk, 'execute').mockImplementation(async (document) => {
		const query = document.toString()
		if (query.includes('query ReadingStatsHasReadingHistory')) {
			if (!hasHistory) throw new Error('Unexpected history query')
			return hasHistory() as never
		}
		return ranged() as never
	})
	const historyCalls = () =>
		execute.mock.calls.filter(([document]) =>
			document.toString().includes('query ReadingStatsHasReadingHistory'),
		).length

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

	return { execute, historyCalls, Wrapper }
}

async function selectRange(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
	await user.click(await screen.findByRole('combobox', { name: /stats range/i }))
	await user.click(await screen.findByRole('option', { name }))
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
	it('should render the stats for the default (year) range without the history query', async () => {
		const { Wrapper, execute, historyCalls } = setup(() => stats(2))
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/you read on 2 days/i)).toBeInTheDocument()
		expect(screen.getByText(/books finished/i)).toBeInTheDocument()
		expect(screen.getByText(/based on 2 books/i)).toBeInTheDocument()
		expect(screen.getByRole('img', { name: 'Jan 1 - Jan 3' })).toBeInTheDocument()
		expect(execute).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ range: { start: expect.stringMatching(/-01-01$/) } }),
		)
		expect(historyCalls()).toBe(0)
	})

	it('should show the no reading history state without the headline', async () => {
		const { Wrapper, historyCalls } = setup({ ranged: () => stats(0), history: () => history(0) })
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/no reading activity/i)).toBeInTheDocument()
		expect(await screen.findByText(/once you start reading/i)).toBeInTheDocument()
		expect(screen.queryByText(/you read on/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/books finished/i)).not.toBeInTheDocument()
		expect(historyCalls()).toBe(1)
	})

	it('should suggest another range when there is reading history outside of it', async () => {
		const { Wrapper } = setup({ ranged: () => stats(0), history: () => history(12) })
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/try another range/i)).toBeInTheDocument()
		expect(screen.queryByText(/once you start reading/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/you read on/i)).not.toBeInTheDocument()
	})

	it('should request an unbounded range for lifetime', async () => {
		const user = userEvent.setup()
		const { Wrapper, execute } = setup(() => stats(2))
		render(<RangedStats />, { wrapper: Wrapper })

		await selectRange(user, /lifetime/i)

		await waitFor(() => expect(execute).toHaveBeenLastCalledWith(expect.anything(), { range: {} }))
	})

	it('should not run the history query when lifetime is empty', async () => {
		const user = userEvent.setup()
		let empty = false
		const { Wrapper, historyCalls } = setup({ ranged: () => stats(empty ? 0 : 2) })
		render(<RangedStats />, { wrapper: Wrapper })
		await screen.findByText(/you read on 2 days/i)

		empty = true
		await selectRange(user, /lifetime/i)

		expect(await screen.findByText(/once you start reading/i)).toBeInTheDocument()
		expect(historyCalls()).toBe(0)
	})

	it('should show and log the error with a retry when the stats fail to load', async () => {
		const user = userEvent.setup()
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		let fail = true
		const { Wrapper } = setup(() => {
			if (fail) throw new Error('Something went wrong on the server')
			return stats(2)
		})
		render(<RangedStats />, { wrapper: Wrapper })

		expect(await screen.findByText(/failed to load reading stats/i)).toBeInTheDocument()
		expect(screen.getByText('Something went wrong on the server')).toBeInTheDocument()
		expect(consoleError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Something went wrong on the server' }),
		)

		fail = false
		await user.click(screen.getByRole('button', { name: /try again/i }))

		expect(await screen.findByText(/books finished/i)).toBeInTheDocument()
		consoleError.mockRestore()
	})
})
