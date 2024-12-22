import { useLocaleContext } from '@stump/i18n'
import { APIKey, User } from '@stump/sdk'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { useAppContext } from '@/context'

import APIKeyInspector from '../APIKeyInspector'

jest.mock('@/context', () => ({
	useAppContext: jest.fn(),
}))
const useAppContextRet = {
	user: {
		id: 'user-id',
		is_server_owner: false,
		permissions: ['feature:api_keys'],
	} as User,
} as any

jest.mock('@stump/i18n', () => ({
	useLocaleContext: jest.fn(),
}))
const translate = jest.fn().mockImplementation((key: string) => key)

const createKey = (overrides: Partial<APIKey> = {}): APIKey => ({
	id: 1,
	name: 'key-name',
	permissions: [],
	created_at: '2021-01-01',
	expires_at: null,
	last_used_at: null,
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
		render(Subject(createKey({ permissions: ['feature:api_keys', 'bookclub:create'] })))

		expect(screen.getByTestId('permissions-meta')).toBeInTheDocument()
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('fields.permissions'))
		expect(screen.getAllByTestId('permission-badge')).toHaveLength(2)
	})

	it('should render an implicit key properly', () => {
		jest.mocked(useAppContext).mockReturnValue({
			...useAppContextRet,
			user: { ...useAppContextRet.user, permissions: ['feature:api_keys', 'bookclub:create'] },
		})

		render(Subject(createKey({ permissions: 'inherit' })))

		expect(screen.getByTestId('permissions-meta')).toBeInTheDocument()
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('fields.permissions'))
		expect(screen.getAllByTestId('permission-badge')).toHaveLength(2)
	})

	it('should render an unrestricted key properly', () => {
		jest.mocked(useAppContext).mockReturnValue({
			...useAppContextRet,
			user: { ...useAppContextRet.user, is_server_owner: true },
		})
		render(Subject(createKey({ permissions: 'inherit' })))

		expect(screen.getByTestId('unrestricted-meta')).toBeInTheDocument()
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('unrestrictedKey.heading'))
		expect(translate).toHaveBeenCalledWith(expect.stringContaining('unrestrictedKey.description'))
	})
})
