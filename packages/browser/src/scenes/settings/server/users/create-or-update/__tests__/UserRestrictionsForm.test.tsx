import '@/__mocks__/resizeObserver'

import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import { buildSchema, CreateOrUpdateUserSchema, formDefaults } from '../schema'
import UserRestrictionsForm from '../UserRestrictionsForm'

const onSubmit = jest.fn()

const userDefaults = {
	username: 'test',
} as any

const Subject = () => {
	const form = useForm<Pick<CreateOrUpdateUserSchema, 'ageRestrictionOnUnset' | 'ageRestriction'>>({
		defaultValues: formDefaults(userDefaults),
		resolver: zodResolver(buildSchema((t) => t, [], userDefaults)),
	})

	return (
		<Form form={form} onSubmit={onSubmit}>
			<UserRestrictionsForm />
			<button type="submit">Submit</button>
		</Form>
	)
}

describe('UserRestrictionsForm', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should render', () => {
		expect(render(<Subject />).container).not.toBeEmptyDOMElement()
	})

	it('should not allow an invalid number', async () => {
		render(<Subject />)

		const user = userEvent.setup()

		await user.type(screen.getByTestId('ageRestriction'), 'abc')
		await user.click(screen.getByRole('button', { name: /submit/i }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ ageRestriction: undefined }),
			expect.anything(), // event
		)
	})

	it('should uncheck the ageRestrictionOnUnset if ageRestriction is unset', async () => {
		render(<Subject />)

		const user = userEvent.setup()

		await user.type(screen.getByTestId('ageRestriction'), '12')
		await user.click(screen.getByTestId('age_restriction_enabled'))
		await user.click(screen.getByRole('button', { name: /submit/i }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ ageRestriction: 12, ageRestrictionOnUnset: true }),
			expect.anything(), // event
		)

		onSubmit.mockClear()

		await user.clear(screen.getByTestId('ageRestriction'))
		await user.click(screen.getByRole('button', { name: /submit/i }))
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ ageRestriction: undefined, ageRestrictionOnUnset: undefined }),
			expect.anything(), // event
		)
	})

	it('should disable the ageRestrictionOnUnset if ageRestriction is unset', async () => {
		render(<Subject />)

		const user = userEvent.setup()
		expect(screen.getByTestId('age_restriction_enabled')).toBeDisabled()
		await user.type(screen.getByTestId('ageRestriction'), '12')
		expect(screen.getByTestId('age_restriction_enabled')).not.toBeDisabled()
	})
})
