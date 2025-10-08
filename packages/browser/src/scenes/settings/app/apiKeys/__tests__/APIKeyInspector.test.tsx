import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AuthUser } from '@stump/sdk'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { useAppContext } from '@/context'

import APIKeyInspector from '../APIKeyInspector'
import { APIKey } from '../APIKeyTable'

jest.mock('@/context', () => ({
	useAppContext: jest.fn(),
}))
const useAppContextRet = {
	user: {
		id: 'user-id',
		isServerOwner: false,
		permissions: {
			__typename: 'UserPermissionStruct',
			value: [UserPermission.AccessApiKeys],
		},
	} as unknown as AuthUser,
} as any

jest.mock('@stump/i18n', () => ({
	useLocaleContext: jest.fn(),
}))
const translate = jest.fn().mockImplementation((key: string) => key)

const createKey = (overrides: Partial<APIKey> = {}): APIKey => ({
	id: 1,
	name: 'key-name',
	permissions: {
		__typename: 'UserPermissionStruct',
		value: [],
	},
	createdAt: '2021-01-01',
	expiresAt: null,
	lastUsedAt: null,
	...overrides,
})

const Subject = (apiKey: APIKey | null) => {
	return (
		<MemoryRouter>
			<APIKeyInspector apiKey={apiKey} onClose={jest.fn()} />
		</MemoryRouter>
	)
}

describe('APIKeyInspector', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(useAppContext).mockReturnValue(useAppContextRet)
		jest.mocked(useLocaleContext).mockReturnValue({ t: translate } as any)
	})

	it('should render a key with explicit permissions properly', () => {
		render(
			Subject(
				createKey({
					permissions: {
						__typename: 'UserPermissionStruct',
						value: [UserPermission.AccessApiKeys, UserPermission.CreateBookClub],
					},
				}),
			),
		)

		expect(screen.getByTestId('permissions-meta')).toBeInTheDocument()
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('fields.permissions'))
		expect(screen.getAllByTestId('permission-badge')).toHaveLength(2)
	})

	it('should render an implicit key properly', () => {
		jest.mocked(useAppContext).mockReturnValue({
			...useAppContextRet,
			user: {
				...useAppContextRet.user,
				permissions: [UserPermission.AccessApiKeys, UserPermission.CreateBookClub],
			},
		})

		render(
			Subject(
				createKey({
					permissions: {
						__typename: 'InheritPermissionStruct',
					},
				}),
			),
		)

		expect(screen.getByTestId('permissions-meta')).toBeInTheDocument()
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('fields.permissions'))
		expect(screen.getAllByTestId('permission-badge')).toHaveLength(2)
	})

	it('should render an unrestricted key properly', () => {
		jest.mocked(useAppContext).mockReturnValue({
			...useAppContextRet,
			user: { ...useAppContextRet.user, is_server_owner: true },
		})
		render(Subject(createKey({ permissions: { __typename: 'InheritPermissionStruct' } })))

		expect(screen.getByTestId('unrestricted-meta')).toBeInTheDocument()
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('unrestrictedKey.heading'))
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('unrestrictedKey.description'))
	})
})
