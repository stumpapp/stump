import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropsWithChildren } from 'react'

import { ErrorState } from '../ErrorState'

function Wrapper({ children }: PropsWithChildren) {
	return <LocaleProvider locale="en-US">{children}</LocaleProvider>
}

describe('ErrorState', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should show the title, the error message and a retry action', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const onRetry = vi.fn()
		render(
			<ErrorState title="Failed to Load" error={new Error('Network down')} onRetry={onRetry} />,
			{
				wrapper: Wrapper,
			},
		)

		expect(screen.getByText('Failed to Load')).toBeInTheDocument()
		expect(screen.getByText('Network down')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /copy error details/i })).toBeInTheDocument()

		await userEvent.click(screen.getByRole('button', { name: /try again/i }))
		expect(onRetry).toHaveBeenCalledOnce()
	})

	it('should log the error once, not on every render', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const error = new Error('Network down')
		const { rerender } = render(<ErrorState title="Failed to Load" error={error} />, {
			wrapper: Wrapper,
		})
		rerender(<ErrorState title="Still failing" error={error} />)

		expect(consoleError).toHaveBeenCalledOnce()
		expect(consoleError).toHaveBeenCalledWith(error)
	})

	it('should fall back to a generic message without retry or details', () => {
		render(<ErrorState title="Failed to Load" />, { wrapper: Wrapper })

		expect(screen.getByText(/the error message was empty/i)).toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
