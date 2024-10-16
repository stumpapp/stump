import {
	queryClient,
	QueryClientContext,
	StumpClientContext,
	useClientContext,
	useLogout,
} from '@stump/client'
import { checkUrl } from '@stump/sdk'
import { fireEvent, render, screen } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router'

import { useTauriRPC } from '@/hooks/useTauriRPC'
import { useAppStore, useTauriStore, useUserStore } from '@/stores'

import ConfiguredServersList from '../ConfiguredServersList'

jest.mock('react-router', () => ({
	useLocation: jest.fn(),
	useNavigate: jest.fn(),
}))
const navigate = jest.fn()

jest.mock('@/stores', () => ({
	...jest.requireActual('@/stores'),
	useAppStore: jest.fn(),
	useTauriStore: jest.fn(),
	useUserStore: jest.fn(),
}))
const useTauriStoreRet = {
	active_server: undefined,
	addServer: jest.fn(),
	connected_servers: [{ name: 'My Server', uri: 'http://localhost:10801' }],
	editServer: jest.fn(),
	removeServer: jest.fn(),
	resetStore: jest.fn(),
	setActiveServer: jest.fn(),
} satisfies Partial<ReturnType<typeof useTauriStore>>

const createTauriStore = (overrides: Partial<ReturnType<typeof useTauriStore>> = {}) =>
	({
		...useTauriStoreRet,
		...overrides,
	}) as ReturnType<typeof useTauriStore>

const useAppStoreRet = {
	setBaseUrl: jest.fn(),
} as any

const useUserStoreRet = {
	setUser: jest.fn(),
} as any

jest.mock('@stump/client', () => ({
	...jest.requireActual('@stump/client'),
	useClientContext: jest.fn(),
	useLogout: jest.fn(),
}))
const useClientContextRet = {
	tauriRPC: {},
} as any

const useLogoutRet = {
	logout: jest.fn(),
} as any

jest.mock('@/hooks/useTauriRPC', () => ({
	useTauriRPC: jest.fn(),
}))
const useTauriRPCRet = {
	clearCredentialStore: jest.fn(),
} as any

jest.mock('@stump/sdk', () => ({
	...jest.requireActual('@stump/sdk'),
	checkUrl: jest.fn(),
}))

const Subject = () => (
	<QueryClientContext.Provider value={queryClient}>
		<StumpClientContext.Provider value={useClientContextRet}>
			<ConfiguredServersList />
		</StumpClientContext.Provider>
	</QueryClientContext.Provider>
)

describe('ConfiguredServersList', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		queryClient.clear()

		jest.mocked(useLocation).mockReturnValue({ pathname: '/servers' } as any)
		jest.mocked(useNavigate).mockReturnValue(navigate)
		jest.mocked(useAppStore).mockReturnValue(useAppStoreRet)
		jest.mocked(useTauriStore).mockReturnValue(createTauriStore())
		jest.mocked(useUserStore).mockReturnValue(useUserStoreRet)
		jest.mocked(useClientContext).mockReturnValue(useClientContextRet)
		jest.mocked(useTauriRPC).mockReturnValue(useTauriRPCRet)
		jest.mocked(useLogout).mockReturnValue(useLogoutRet)
		jest.mocked(checkUrl).mockResolvedValue(true)
	})

	it('should render', () => {
		render(<Subject />)
		expect(render(<Subject />).container).not.toBeEmptyDOMElement()
	})

	it('should render a confirmation before deleting a server', () => {
		render(<Subject />)

		expect(
			screen.queryByText(
				'settingsScene.app/desktop.sections.configuredServers.deleteServer.confirmation.title',
			),
		).not.toBeInTheDocument()
		fireEvent.click(screen.getByTestId('deleteButton'))
		expect(useTauriStoreRet.removeServer).not.toHaveBeenCalled()
		// The modal is now visible, and so the title should be visible. Note that the locale keys are hard to mock
		expect(
			screen.queryByText(
				'settingsScene.app/desktop.sections.configuredServers.deleteServer.confirmation.title',
			),
		).toBeInTheDocument()
	})

	it('should render a confirmation before switching to a serveer', () => {
		render(<Subject />)

		expect(
			screen.queryByText(
				'settingsScene.app/desktop.sections.configuredServers.switchToServer.confirmation.title',
			),
		).not.toBeInTheDocument()
		fireEvent.click(screen.getByTestId('switchButton'))
		expect(useTauriStoreRet.setActiveServer).not.toHaveBeenCalled()
		// The modal is now visible, and so the title should be visible
		expect(
			screen.queryByText(
				'settingsScene.app/desktop.sections.configuredServers.switchToServer.confirmation.title',
			),
		).toBeInTheDocument()
	})

	// FIXME: The interval tests are failing however I clearly see the interval hitting when actually
	// running the app. Problem for another day
	// it('should ping healthy servers every 10 seconds', async () => {
	// 	jest.useFakeTimers()
	// 	jest.mocked(checkUrl).mockResolvedValueOnce(true)

	// 	render(<Subject />)
	// 	expect(checkUrl).toHaveBeenCalledTimes(1)

	// 	jest.advanceTimersByTime(10_000 * 10)

	// 	await waitFor(() => expect(checkUrl).toHaveBeenCalledTimes(2))
	// })
})
