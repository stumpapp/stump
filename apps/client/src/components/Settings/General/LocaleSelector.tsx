import React from 'react';
import { FormControl, FormLabel } from '@chakra-ui/react';
import { Select } from 'chakra-react-select';
import { useLocale } from '~hooks/useLocale';
import { Locale } from '~util/enums';

// FIXME: style is not aligned with theme, but I am lazy right now so future aaron problem
export default function LocaleSelector() {
	const { t, locale, setLocale, locales } = useLocale();

	function handleLocaleChange(newLocale?: Locale) {
		if (newLocale) {
			setLocale(newLocale);
		}
	}

	return (
		<FormControl>
			<FormLabel htmlFor="locale" mb={2}>
				Language / Locale
			</FormLabel>

			<Select
				value={locales.find((l) => l.value === locale)}
				options={locales}
				onChange={(newLocale) => handleLocaleChange(newLocale?.value)}
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
						px: 2,
						cursor: 'inherit',
					}),
					indicatorSeparator: (provided) => ({
						...provided,
						display: 'none',
					}),
				}}
			/>
		</FormControl>
	);
}
