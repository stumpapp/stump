import '@/__mocks__/resizeObserver'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import ReadStatusSelect from '../ReadStatusSelect'

vi.mock('@/hooks/useTranslate', () => ({
	useTranslate: () => ({ t: (s: string) => s, translate: (s: string) => s }),
}))

type FormValues = {
	read_status: string[]
}

function TestSubject() {
	const form = useForm<FormValues>({ defaultValues: { read_status: [] } })
	const value = useWatch({ control: form.control, name: 'read_status' })

	return (
		<FormProvider {...form}>
			<ReadStatusSelect />
			<output data-testid="read-status-value">{value.join(',')}</output>
		</FormProvider>
	)
}

describe('ReadStatusSelect', () => {
	it('renders localized options and updates the form value', async () => {
		const user = userEvent.setup()
		render(<TestSubject />)

		expect(screen.getByText('mediaFilterForm.readStatusSelect.label')).toBeInTheDocument()
		const trigger = screen.getByRole('combobox')
		await user.click(trigger)
		await user.click(await screen.findByText('mediaFilterForm.readStatusSelect.options.completed'))

		expect(screen.getByTestId('read-status-value')).toHaveTextContent('finished')
		expect(trigger).toHaveTextContent('mediaFilterForm.readStatusSelect.options.completed')
	})
})
