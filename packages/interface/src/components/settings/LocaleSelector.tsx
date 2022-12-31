import { FormControl, FormLabel } from '@chakra-ui/react'
import { Select, SingleValue } from 'chakra-react-select'

import { Locale, LocaleSelectOption, useLocale } from '../../hooks/useLocale'

// FIXME: style is not aligned with theme, but I am lazy right now so future aaron problem
// TODO: use locale for labels
export default function LocaleSelector() {
	const { locale, setLocale, locales } = useLocale()

	function handleLocaleChange(newLocale?: Locale) {
		if (newLocale) {
			setLocale(newLocale)
		}
	}

	return (
		<FormControl>
			<FormLabel htmlFor="locale" mb={2}>
				Language / Locale
			</FormLabel>
			<Select
				isDisabled
				value={locales.find((l) => l.value === locale)}
				options={locales}
				onChange={(newLocale: SingleValue<LocaleSelectOption>) =>
					handleLocaleChange(newLocale?.value)
				}
				chakraStyles={{
					control: (provided) => ({
						...provided,
						_focus: {
							boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
						},
					}),
					dropdownIndicator: (provided) => ({
						...provided,
						bg: 'transparent',
						cursor: 'inherit',
						px: 2,
					}),
					indicatorSeparator: (provided) => ({
						...provided,
						display: 'none',
					}),
				}}
			/>
		</FormControl>
	)
}
