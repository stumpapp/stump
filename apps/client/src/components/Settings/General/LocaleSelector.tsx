import { FormControl, FormLabel } from '@chakra-ui/react';
import { Select } from 'chakra-react-select';
import React from 'react';
import { useLocale } from '~hooks/useLocale';

export default function LocaleSelector() {
	const { t, locale, setLocale, locales } = useLocale();

	return (
		<FormControl>
			<FormLabel htmlFor="locale" mb={2}>
				Language / Locale
			</FormLabel>

			<Select
				// value={locale}
				options={locales}
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
