import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import AgeRatingFilter from '../AgeRatingFilter'

type FormValues = {
	metadata: {
		ageRating: number | null
	}
}

function TestSubject({ variant = 'media' }: { variant?: 'media' | 'series' }) {
	const form = useForm<FormValues>({ defaultValues: { metadata: { ageRating: null } } })
	const value = useWatch({ control: form.control, name: 'metadata.ageRating' })

	return (
		<LocaleProvider locale="en-US">
			<FormProvider {...form}>
				<AgeRatingFilter variant={variant} />
				<output data-testid="age-rating-value">{value ?? 'none'}</output>
			</FormProvider>
		</LocaleProvider>
	)
}

describe('AgeRatingFilter', () => {
	it('renders localized media copy and updates the form value', async () => {
		const user = userEvent.setup()
		render(<TestSubject />)

		expect(screen.getByText('Age Rating')).toBeInTheDocument()
		expect(screen.getByText('No age rating filter will be applied')).toBeInTheDocument()
		expect(
			screen.getByText(
				'Only media with an age rating of N or lower will be shown, where N is the number you enter below',
			),
		).toBeInTheDocument()

		await user.click(screen.getByRole('radio', { name: /Aged N and up/ }))
		expect(screen.getByTestId('age-rating-value')).toHaveTextContent('8')

		await user.click(screen.getByRole('radio', { name: /Any age/ }))
		expect(screen.getByTestId('age-rating-value')).toHaveTextContent('none')
	})

	it('uses the series-specific localized description', () => {
		render(<TestSubject variant="series" />)

		expect(
			screen.getByText(
				'Only series with an age rating of N or lower will be shown, where N is the number you enter below',
			),
		).toBeInTheDocument()
	})
})
