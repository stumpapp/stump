import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import MaxSessionsAllowed from '../MaxSessionsAllowed'
import { buildSchema, CreateOrUpdateUserSchema, formDefaults } from '../schema'

const onSubmit = jest.fn()

type SubjectProps = {
	formState?: Partial<Pick<CreateOrUpdateUserSchema, 'maxSessionsAllowed'>>
}

const Subject = ({ formState }: SubjectProps) => {
	const form = useForm<Pick<CreateOrUpdateUserSchema, 'maxSessionsAllowed'>>({
		defaultValues: formDefaults(formState as any),
		resolver: zodResolver(buildSchema((t) => t, [], formState as any)),
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

		await user.type(screen.getByTestId('maxSessionsAllowed'), 'abc')
		await user.click(screen.getByRole('button', { name: /submit/i }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('should display errors', async () => {
		// Start with an invalid negative value to test validation
		render(
			<Subject
				formState={{
					maxSessionsAllowed: -1,
				}}
			/>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: /submit/i }))

		expect(onSubmit).not.toHaveBeenCalled()
		await waitFor(() => expect(screen.getByText(/maxSessionsAllowedTooLow/i)).toBeInTheDocument())
	})
})
