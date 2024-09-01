import '@/__mocks__/resizeObserver'

import { act, fireEvent, render, screen } from '@testing-library/react'
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
	const emailer = { ...validEmailer, ...overrides }

	fireEvent.input(screen.getByTestId('name'), { target: { value: emailer.name } })
	fireEvent.input(screen.getByTestId('password'), { target: { value: emailer.password } })
	fireEvent.input(screen.getByTestId('sender_display_name'), {
		target: { value: emailer.sender_display_name },
	})
	fireEvent.input(screen.getByTestId('sender_email'), { target: { value: emailer.sender_email } })
	fireEvent.input(screen.getByTestId('smtp_host'), { target: { value: emailer.smtp_host } })
	fireEvent.input(screen.getByTestId('smtp_port'), { target: { value: emailer.smtp_port } })
	fireEvent.input(screen.getByTestId('username'), { target: { value: emailer.username } })

	if (emailer.tls_enabled) {
		fireEvent.click(screen.getByTestId('tls_enabled'))
	}

	if (emailer.max_attachment_size_bytes != null) {
		fireEvent.input(screen.getByTestId('max_attachment_size_bytes'), {
			target: { value: emailer.max_attachment_size_bytes },
		})
	}
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

		inputEmailer()

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /submit/i }))
		})

		expect(onSubmit).toHaveBeenCalledWith(
			validEmailer,
			expect.any(Object), // Submit event
		)
	})

	// TODO: more tests
})
