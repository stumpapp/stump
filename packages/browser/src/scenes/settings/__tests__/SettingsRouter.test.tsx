import { UserPermission } from '@stump/graphql'
import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { type IAppContext, useAppContext } from '@/context'
import { useAppStore } from '@/stores/app.ts'

import SettingsRouter from '../SettingsRouter'

vi.mock('@/context', () => ({ useAppContext: vi.fn() }))
vi.mock('@/stores/app.ts', () => ({ useAppStore: vi.fn() }))

// this layout pulls in many heavy deps that i dont want to bother
// implementing mocks for, nor do i think it would even be useful
vi.mock('../SettingsLayout.tsx', async () => {
	const { Outlet } = await import('react-router')
	return { default: () => <Outlet /> }
})

vi.mock('../server/users/UsersRouter.tsx', () => ({
	default: () => <div data-testid="users-router" />,
}))
vi.mock('../server/email/EmailSettingsRouter.tsx', () => ({
	default: () => <div data-testid="email-router" />,
}))

vi.mock('../app/general/GeneralSettingsScene.tsx', () => ({
	default: () => <div data-testid="account-scene" />,
}))
vi.mock('../server/general/GeneralServerSettingsScene.tsx', () => ({
	default: () => <div data-testid="server-scene" />,
}))

const buildContext = (permissions: UserPermission[]): IAppContext => ({
	checkPermission: (p: UserPermission) => permissions.includes(p),
	isServerOwner: false,
	user: {} as any,
	logout: vi.fn(),
	enforcePermission: vi.fn(),
})

/**
 * render at specific path with permissions
 *
 * @param subPath relative to settings route, e.g. 'users' or 'server'
 * @param permissions self explanatory stinky
 */
const renderAt = (subPath: string, permissions: UserPermission[] = []) => {
	vi.mocked(useAppContext).mockReturnValue(buildContext(permissions))
	vi.mocked(useAppStore).mockImplementation((selector: any) => selector({ platform: 'browser' }))

	return render(
		<MemoryRouter initialEntries={[`/settings/${subPath}`]}>
			<Suspense fallback={null}>
				<Routes>
					<Route path="/settings/*" element={<SettingsRouter />} />
				</Routes>
			</Suspense>
		</MemoryRouter>,
	)
}

describe('SettingsRouter', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('users route', () => {
		it('renders when the user has ReadUsers', async () => {
			renderAt('users', [UserPermission.ReadUsers])
			expect(await screen.findByTestId('users-router')).toBeInTheDocument()
		})

		it('redirects to account when the user lacks ReadUsers', async () => {
			renderAt('users', [])
			expect(await screen.findByTestId('account-scene')).toBeInTheDocument()
			expect(screen.queryByTestId('users-router')).not.toBeInTheDocument()
		})
	})

	describe('server settings route', () => {
		it('renders when the user has ManageServer', async () => {
			renderAt('server', [UserPermission.ManageServer])
			expect(await screen.findByTestId('server-scene')).toBeInTheDocument()
		})

		it('redirects to account when the user lacks ManageServer', async () => {
			renderAt('server', [])
			expect(await screen.findByTestId('account-scene')).toBeInTheDocument()
			expect(screen.queryByTestId('server-scene')).not.toBeInTheDocument()
		})
	})
})
