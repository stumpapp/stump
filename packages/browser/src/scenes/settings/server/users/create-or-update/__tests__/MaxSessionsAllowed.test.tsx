import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { User } from '@stump/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import MaxSessionsAllowed from '../MaxSessionsAllowed'
import { buildSchema, CreateOrUpdateUserSchema, formDefaults } from '../schema'

const onSubmit = jest.fn()

type SubjectProps = {
	formState?: Partial<Pick<CreateOrUpdateUserSchema, 'max_sessions_allowed'>>
}

const Subject = ({ formState }: SubjectProps) => {
	const form = useForm<Pick<CreateOrUpdateUserSchema, 'max_sessions_allowed'>>({
		defaultValues: formDefaults(formState as User | undefined),
		resolver: zodResolver(buildSchema((t) => t, [], formState as User | undefined)),
	})

	return (
		<Form form={form} onSubmit={onSubmit}>
			<MaxSessionsAllowed />
			<button type="submit">Submit</button>
		</Form>
	)
}

describe('MaxSessionsAllowed', () => {
	// TODO: fix the warning about uncontrolled input
	const originalError = console.error
	beforeAll(() => {
		console.error = jest.fn()
	})
	afterAll(() => {
		console.error = originalError
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should render', () => {
		expect(render(<Subject />).container).not.toBeEmptyDOMElement()
	})

	it('should not allow an invalid number', async () => {
		render(<Subject />)

		const user = userEvent.setup()

		await user.type(screen.getByTestId('max_sessions_allowed'), 'abc')
		await user.click(screen.getByRole('button', { name: /submit/i }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('should display errors', async () => {
		render(
			<Subject
				formState={{
					max_sessions_allowed: 1,
				}}
			/>,
		)

		const user = userEvent.setup()

		await user.clear(screen.getByTestId('max_sessions_allowed'))
		await user.type(screen.getByTestId('max_sessions_allowed'), '-1')
		await user.click(screen.getByRole('button', { name: /submit/i }))

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(/maxSessionsAllowedTooLow/i)).toBeInTheDocument()
	})
})
