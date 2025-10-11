import '@/__mocks__/resizeObserver'

import { Emailer } from '@stump/graphql'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentProps } from 'react'

import CreateOrUpdateEmailerForm from '../CreateOrUpdateEmailerForm'
import { CreateOrUpdateEmailerSchema } from '../schema'

jest.mock('@stump/i18n', () => ({
	useLocaleContext: () => ({ t: (s: string) => s }),
}))

const validEmailer: CreateOrUpdateEmailerSchema = {
	isPrimary: true,
	maxAttachmentSizeBytes: null,
	name: 'newName',
	password: 'password',
	senderDisplayName: 'senderDisplayName',
	senderEmail: 'senderEmail@gmail.com',
	smtpHost: 'smtpHost',
	smtpPort: 123,
	tlsEnabled: false,
	username: 'username',
}

const inputEmailer = async (overrides: Partial<CreateOrUpdateEmailerSchema> = {}) => {
	const user = userEvent.setup()

	const emailer = { ...validEmailer, ...overrides }

	await user.type(screen.getByTestId('name'), emailer.name)
	if (emailer.password) {
		await user.type(screen.getByTestId('password'), emailer.password)
	}
	await user.type(screen.getByTestId('senderDisplayName'), emailer.senderDisplayName)
	await user.type(screen.getByTestId('senderEmail'), emailer.senderEmail)
	await user.type(screen.getByTestId('smtpHost'), emailer.smtpHost)
	await user.type(screen.getByTestId('smtpPort'), emailer.smtpPort.toString())
	await user.type(screen.getByTestId('username'), emailer.username)

	if (emailer.tlsEnabled) {
		await user.click(screen.getByTestId('tlsEnabled'))
	}

	if (emailer.maxAttachmentSizeBytes != null) {
		await user.type(
			screen.getByTestId('maxAttachmentSizeBytes'),
			emailer.maxAttachmentSizeBytes.toString(),
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
		it('should allow optional maxAttachmentSizeBytes', async () => {
			render(<Subject />)

			const user = await inputEmailer({ maxAttachmentSizeBytes: undefined })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ maxAttachmentSizeBytes: null }),
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
						} as unknown as Emailer
					}
				/>,
			)

			const user = await inputEmailer({ password: '' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should require a valid email address for senderEmail', async () => {
			render(<Subject />)

			const user = await inputEmailer({ senderEmail: 'invalid' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('should require a number for smtpPort', async () => {
			render(<Subject />)

			// @ts-expect-error: smtpPort is a number
			const user = await inputEmailer({ smtpPort: 'foo' })

			await act(() => user.click(screen.getByRole('button', { name: /submit/i })))

			expect(onSubmit).not.toHaveBeenCalled()
		})
	})
})
