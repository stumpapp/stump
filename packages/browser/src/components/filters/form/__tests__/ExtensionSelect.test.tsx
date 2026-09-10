import { LocaleProvider } from '@stump/i18n'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import ExtensionSelect from '../ExtensionSelect'
import { MediaFilterFormSchema } from '../MediaFilterForm'

function TestSubject() {
	const form = useForm<MediaFilterFormSchema>({ defaultValues: { extension: '' } })
	const value = useWatch({ control: form.control, name: 'extension' })

	return (
		<LocaleProvider locale="en-US">
			<FormProvider {...form}>
				<ExtensionSelect />
				<output data-testid="extension-value">{value}</output>
			</FormProvider>
		</LocaleProvider>
	)
}

describe('ExtensionSelect', () => {
	it('renders localized copy, preserves format names, and updates the form value', () => {
		render(<TestSubject />)

		const select = screen.getByRole('combobox')
		expect(screen.getByText('Extension')).toBeInTheDocument()
		expect(
			within(select)
				.getAllByRole('option')
				.map(({ textContent }) => textContent),
		).toEqual(['Any', 'CBZ', 'CBR', 'ZIP', 'RAR', 'EPUB', 'PDF'])

		fireEvent.change(select, { target: { value: 'epub' } })
		expect(screen.getByTestId('extension-value')).toHaveTextContent('epub')
	})
})
