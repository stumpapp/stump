import type { UserPreferences } from '@stump/graphql'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import StumpWebClient from '../App'
import { useUserStore } from '../stores'

jest.mock('../styles/index.css', () => ({}))
jest.mock('@stump/components/styles/overrides.css', () => ({}))

jest.mock('../AppRouter', () => ({
	AppRouter: () => {
		throw new Error('Test error')
	},
}))

describe('StumpWebClient', () => {
	const originalError = console.error

	beforeAll(() => {
		console.error = jest.fn()
	})

	afterAll(() => {
		console.error = originalError
	})

	afterEach(() => {
		useUserStore.getState().setUserPreferences(null)
	})

	it('renders the error fallback with the selected locale', async () => {
		useUserStore.getState().setUserPreferences({ locale: 'ko-KR' } as unknown as UserPreferences)

		render(
			<MemoryRouter>
				<StumpWebClient platform="browser" baseUrl="http://localhost:10801" />
			</MemoryRouter>,
		)

		expect(
			await screen.findByRole('heading', { name: '치명적인 오류가 발생했습니다' }),
		).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '홈으로 이동' })).toBeInTheDocument()
	})
})
