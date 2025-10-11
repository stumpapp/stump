import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import AccountDetails from '../AccountDetails'
import { buildSchema, CreateOrUpdateUserSchema, ExistingUser, formDefaults } from '../schema'

const onSubmit = jest.fn()

type SubjectProps = {
	formState?: Partial<Pick<CreateOrUpdateUserSchema, 'username' | 'password'>>
	existingUsers?: ExistingUser[]
}

const Subject = ({ formState, existingUsers = [] }: SubjectProps) => {
	const form = useForm<Pick<CreateOrUpdateUserSchema, 'username' | 'password'>>({
		defaultValues: formDefaults(formState as ExistingUser | undefined),
		resolver: zodResolver(
			buildSchema(
				(t) => t,
				existingUsers.map((user) => user.username),
				formState as ExistingUser | undefined,
			),
		),
	})

	return (
		<Form form={form} onSubmit={onSubmit}>
			<AccountDetails />

			<button type="submit">Submit</button>
		</Form>
	)
}

describe('AccountDetails', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should render', () => {
		expect(render(<Subject />).container).not.toBeEmptyDOMElement()
	})

	it('should mask the password by default and allow toggling visibility', async () => {
		const { getByTestId } = render(<Subject />)

		const passwordInput = getByTestId('password') as HTMLInputElement
		expect(passwordInput.type).toBe('password')

		await act(async () => {
			fireEvent.click(getByTestId('togglePasswordVisibility'))
		})

		expect(passwordInput.type).toBe('text')
	})

	it('should generate a random password', () => {
		const { getByTestId } = render(<Subject />)
		// value empty
		const passwordInput = getByTestId('password') as HTMLInputElement
		expect(passwordInput.value).toBe('')

		const generatePasswordButton = getByTestId('generatePassword')
		fireEvent.click(generatePasswordButton)
		expect(passwordInput.value).not.toBe('')
		expect(passwordInput.value).toHaveLength(16)
	})

	it('should properly display errors', async () => {
		const { getByTestId } = render(<Subject existingUsers={[{ username: 'bob' } as any]} />)

		const user = userEvent.setup()

		await user.type(getByTestId('username'), 'bob') // Duplicate username
		await user.click(screen.getByRole('button', { name: /submit/i })) // No password

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(/usernameAlreadyExists/i)).toBeInTheDocument()
		expect(screen.getByText(/missingPassword/i)).toBeInTheDocument()
	})
})
