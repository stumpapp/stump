import '@/__mocks__/resizeObserver'

import { SMTPEmailer } from '@stump/types'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentProps } from 'react'

import CreateOrUpdateEmailerForm from '../CreateOrUpdateEmailerForm'
import { CreateOrUpdateEmailerSchema } from '../schema'

jest.mock('@stump/i18n', () => ({
	useLocaleContext: () => ({ t: (s: string) => s }),
}))

const validEmailer: CreateOrUpdateEmailerSchema = {
	is_primary: true,
	max_attachment_size_bytes: null,
	name: 'newName',
	password: 'password',
	sender_display_name: 'sender_display_name',
	sender_email: 'sender_email@gmail.com',
	smtp_host: 'smtp_host',
	smtp_port: 123,
	tls_enabled: false,
	username: 'username',
}

const inputEmailer = async (overrides: Partial<CreateOrUpdateEmailerSchema> = {}) => {
	const user = userEvent.setup()

	const emailer = { ...validEmailer, ...overrides }

	await user.type(screen.getByTestId('name'), emailer.name)
	if (emailer.password) {
		await user.type(screen.getByTestId('password'), emailer.password)
	}
	await user.type(screen.getByTestId('sender_display_name'), emailer.sender_display_name)
	await user.type(screen.getByTestId('sender_email'), emailer.sender_email)
	await user.type(screen.getByTestId('smtp_host'), emailer.smtp_host)
	await user.type(screen.getByTestId('smtp_port'), emailer.smtp_port.toString())
	await user.type(screen.getByTestId('username'), emailer.username)

	if (emailer.tls_enabled) {
		await user.click(screen.getByTestId('tls_enabled'))
	}

	if (emailer.max_attachment_size_bytes != null) {
		await user.type(
			screen.getByTestId('max_attachment_size_bytes'),
			emailer.max_attachment_size_bytes.toString(),
		)
	}

	return user
}

const onSubmit = jest.fn()

type SubjectProps = Omit<Partial<ComponentProps<typeof CreateOrUpdateEmailerForm>>, 'onSubmit'>
const Subject = ({ existingNames = [], ...props }: SubjectProps) => (
	<CreateOrUpdateEmailerForm {...props} existingNames={existingNames} onSubmit={onSubmit} />
)

describe('CreateOrUpdateEmailerForm', () => {
	// TODO: fix the select component emitting a warning about defaultValue vs value
	const originalError = console.error.bind(console.error)
	beforeAll(() => {
		console.error = jest.fn()
	})
	afterAll(() => {
		console.error = originalError
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders properly', async () => {
		const { container } = render(<Subject />)
		expect(container).not.toBeEmptyDOMElement()
	})

	test('should submit with valid data', async () => {
		render(<Subject />)

		const user = await inputEmailer()

		await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

		expect(onSubmit).toHaveBeenCalledWith(
			validEmailer,
			expect.any(Object), // Submit event
		)
	})

	describe('validation', () => {
		it('should allow optional max_attachment_size_bytes', async () => {
			render(<Subject />)

			const user = await inputEmailer({ max_attachment_size_bytes: undefined })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ max_attachment_size_bytes: null }),
				expect.any(Object), // Submit event
			)
		})

		it('should not allow duplicate names', async () => {
			render(<Subject existingNames={['existingName']} />)

			const user = await inputEmailer({ name: 'existingName' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			// Error message should be displayed
			await waitFor(() => expect(screen.getByText(/nameAlreadyExists/i)).toBeInTheDocument())

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should not allow forbidden names', async () => {
			render(<Subject />)

			const user = await inputEmailer({ name: 'new' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should require a password when creating', async () => {
			render(<Subject />)

			const user = await inputEmailer({ password: undefined })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			// Error message should be displayed
			await waitFor(() => expect(screen.getByText(/password/i)).toBeInTheDocument())

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should not allow an empty password when creating', async () => {
			render(<Subject />)

			const user = await inputEmailer({ password: '' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should require a non-empty password when update includes password', async () => {
			render(
				<Subject
					emailer={
						{
							...validEmailer,
							config: {
								...validEmailer,
							},
							id: 1,
						} as unknown as SMTPEmailer
					}
				/>,
			)

			const user = await inputEmailer({ password: '' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should require a valid email address for sender_email', async () => {
			render(<Subject />)

			const user = await inputEmailer({ sender_email: 'invalid' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should require a number for smtp_port', async () => {
			render(<Subject />)

			// @ts-expect-error: smtp_port is a number
			const user = await inputEmailer({ smtp_port: 'foo' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})
	})
})
