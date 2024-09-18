import '@/__mocks__/resizeObserver'

import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { User, UserPermission } from '@stump/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import { buildSchema, CreateOrUpdateUserSchema, formDefaults } from '../schema'
import UserPermissionsForm, { associatedPermissions } from '../UserPermissionsForm'

const onSubmit = jest.fn()

const userDefaults = {
	username: 'test',
} as User

const Subject = () => {
	const form = useForm<Pick<CreateOrUpdateUserSchema, 'permissions'>>({
		defaultValues: formDefaults(userDefaults),
		resolver: zodResolver(buildSchema((t) => t, [], userDefaults)),
	})

	return (
		<Form form={form} onSubmit={onSubmit}>
			<UserPermissionsForm />
			<button type="submit">Submit</button>
		</Form>
	)
}

describe('UserPermissionsForm', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should render', () => {
		expect(render(<Subject />).container).not.toBeEmptyDOMElement()
	})

	it('should automatically select associated permissions', async () => {
		const user = userEvent.setup()

		const experiments = Object.entries(associatedPermissions)
			.filter(([, associations]) => associations.length > 0)
			.filter(([permission]) => !permission.startsWith('notifier')) // TODO: undo when notifier features available
			.map(([permission]) => permission) as UserPermission[]

		for (const permission of experiments) {
			const { unmount } = render(<Subject />)

			await user.click(screen.getByTestId(permission))
			await user.click(screen.getByRole('button', { name: /submit/i }))

			const expected = associatedPermissions[permission]

			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					permissions: expect.arrayContaining(expected),
				}),
				expect.anything(), // event
			)
			onSubmit.mockClear()
			unmount()
		}
	})
})
