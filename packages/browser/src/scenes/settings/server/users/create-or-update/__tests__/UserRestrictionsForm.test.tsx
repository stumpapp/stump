import '@/__mocks__/resizeObserver'

import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import { buildSchema, CreateOrUpdateUserSchema, ExistingUser, formDefaults } from '../schema'
import UserRestrictionsForm from '../UserRestrictionsForm'

const onSubmit = jest.fn()

type SubjectProps = {
	user?: Partial<ExistingUser>
}

const Subject = ({ user }: SubjectProps = {}) => {
	const userDefaults = {
		username: 'test',
		...user,
	} as ExistingUser

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
		render(<Subject user={{ ageRestriction: { age: 12, restrictOnUnset: true } }} />)

		const user = userEvent.setup()

		expect(screen.getByTestId('age_restriction_enabled')).not.toBeDisabled()
		expect(screen.getByTestId('age_restriction_enabled')).toHaveAttribute('aria-checked', 'true')

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

	it('should disable the ageRestrictionOnUnset if ageRestriction is unset', () => {
		render(<Subject />)
		expect(screen.getByTestId('age_restriction_enabled')).toBeDisabled()
	})

	it('should enable the ageRestrictionOnUnset if ageRestriction is set', () => {
		render(<Subject user={{ ageRestriction: { age: 12, restrictOnUnset: false } }} />)
		expect(screen.getByTestId('age_restriction_enabled')).not.toBeDisabled()
	})
})
