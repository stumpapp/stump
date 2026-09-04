import '@/__mocks__/resizeObserver'

import { LocaleProvider } from '@stump/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import ReadStatusSelect from '../ReadStatusSelect'

type FormValues = {
	read_status: string[]
}

function TestSubject() {
	const form = useForm<FormValues>({ defaultValues: { read_status: [] } })
	const value = useWatch({ control: form.control, name: 'read_status' })

	return (
		<LocaleProvider locale="en-US">
			<FormProvider {...form}>
				<ReadStatusSelect />
				<output data-testid="read-status-value">{value.join(',')}</output>
			</FormProvider>
		</LocaleProvider>
	)
}

describe('ReadStatusSelect', () => {
	it('renders localized options and updates the form value', async () => {
		const user = userEvent.setup()
		render(<TestSubject />)

		expect(screen.getByText('Read Status')).toBeInTheDocument()
		const trigger = screen.getByRole('combobox')
		await user.click(trigger)
		await user.click(await screen.findByText('Completed'))

		expect(screen.getByTestId('read-status-value')).toHaveTextContent('finished')
		expect(trigger).toHaveTextContent('Completed')
	})
})
