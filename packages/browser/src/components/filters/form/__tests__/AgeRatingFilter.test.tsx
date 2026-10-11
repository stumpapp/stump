import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import AgeRatingFilter from '../AgeRatingFilter'

vi.mock('@/hooks/useTranslate', () => ({
	useTranslate: () => ({ t: (s: string) => s, translate: (s: string) => s }),
}))

type FormValues = {
	metadata: {
		ageRating: number | null
	}
}

function TestSubject({ variant = 'media' }: { variant?: 'media' | 'series' }) {
	const form = useForm<FormValues>({ defaultValues: { metadata: { ageRating: null } } })
	const value = useWatch({ control: form.control, name: 'metadata.ageRating' })

	return (
		<FormProvider {...form}>
			<AgeRatingFilter variant={variant} />
			<output data-testid="age-rating-value">{value ?? 'none'}</output>
		</FormProvider>
	)
}

describe('AgeRatingFilter', () => {
	it('renders localized media copy and updates the form value', async () => {
		const user = userEvent.setup()
		render(<TestSubject />)

		expect(screen.getByText('shared.bookMetadata.ageRating')).toBeInTheDocument()
		expect(
			screen.getByText('mediaFilterForm.ageRatingFilter.anyAge.description'),
		).toBeInTheDocument()
		expect(
			screen.getByText('mediaFilterForm.ageRatingFilter.custom.description.media'),
		).toBeInTheDocument()

		await user.click(
			screen.getByRole('radio', { name: /mediaFilterForm.ageRatingFilter.custom.label/ }),
		)
		expect(screen.getByTestId('age-rating-value')).toHaveTextContent('8')

		await user.click(
			screen.getByRole('radio', { name: /mediaFilterForm.ageRatingFilter.anyAge.label/ }),
		)
		expect(screen.getByTestId('age-rating-value')).toHaveTextContent('none')
	})

	it('uses the series-specific localized description', () => {
		render(<TestSubject variant="series" />)

		expect(
			screen.getByText('mediaFilterForm.ageRatingFilter.custom.description.series'),
		).toBeInTheDocument()
	})
})
