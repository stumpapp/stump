import { UserPermission } from '@stump/graphql'
import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { type IAppContext, useAppContext } from '@/context'

import UsersRouter from '../UsersRouter'

vi.mock('@/context', () => ({ useAppContext: vi.fn() }))

vi.mock('../UsersScene.tsx', () => ({
	default: () => <div data-testid="users-scene" />,
}))
vi.mock('../create-or-update/CreateUserScene.tsx', () => ({
	default: () => <div data-testid="create-user-scene" />,
}))
vi.mock('../create-or-update/UpdateUserScene.tsx', () => ({
	default: () => <div data-testid="update-user-scene" />,
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
 * @param subPath relative to users route, e.g. 'create' or ':id/manage'
 * @param permissions self explanatory stinky
 */
const renderAt = (subPath: string, permissions: UserPermission[] = []) => {
	vi.mocked(useAppContext).mockReturnValue(buildContext(permissions))

	const fullPath = subPath ? `/settings/users/${subPath}` : '/settings/users'

	return render(
		<MemoryRouter initialEntries={[fullPath]}>
			<Suspense fallback={null}>
				<Routes>
					<Route path="/settings/users/*" element={<UsersRouter />} />
				</Routes>
			</Suspense>
		</MemoryRouter>,
	)
}

describe('UsersRouter', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('root route', () => {
		// this feels a bit odd but at this point when SettingsRouter has rendered UsersRouter
		// we know the user has at least permission to read users
		it('renders the users scene regardless of permissions', async () => {
			renderAt('')
			expect(await screen.findByTestId('users-scene')).toBeInTheDocument()
		})
	})

	describe('create route', () => {
		it('renders with ManageUsers', async () => {
			renderAt('create', [UserPermission.ManageUsers])
			expect(await screen.findByTestId('create-user-scene')).toBeInTheDocument()
		})

		it('does not render without ManageUsers', () => {
			renderAt('create', [])
			expect(screen.queryByTestId('create-user-scene')).not.toBeInTheDocument()
		})
	})

	describe(':id/manage route', () => {
		it('renders with ManageUsers', () => {
			renderAt('some-user-id/manage', [UserPermission.ManageUsers])
			expect(screen.getByTestId('update-user-scene')).toBeInTheDocument()
		})

		it('does not render without ManageUsers', () => {
			renderAt('some-user-id/manage', [])
			expect(screen.queryByTestId('update-user-scene')).not.toBeInTheDocument()
		})
	})
})
