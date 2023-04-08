import { cx, Heading, Link, Text } from '@stump/components'
import { LibraryPattern } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { useLocaleContext } from '../../../i18n/context'

export default function LibraryPatternRadioGroup() {
	const form = useFormContext()

	const { t } = useLocaleContext()

	const libraryPattern: LibraryPattern = form.watch('library_pattern')
	const isCollectionBasedSelected = libraryPattern === 'COLLECTION_BASED'

	const handleChange = (pattern: LibraryPattern) => {
		form.setValue('library_pattern', pattern)
	}

	return (
		<div>
			<Text size="sm" variant="muted">
				{'Select a library pattern:'}
			</Text>
			<input type="hidden" {...form.register('library_pattern')} />
			<div className="flex w-1/3 gap-12">
				<LibraryPatternRadio
					selected={!isCollectionBasedSelected}
					onChange={() => handleChange('SERIES_BASED')}
				>
					<Heading size="xs">{'Series Based'}</Heading>
					<Text size="xs" variant="muted">
						{"Creates a series from the bottom-most level of the library's directory."}
					</Text>
				</LibraryPatternRadio>
				<LibraryPatternRadio
					selected={isCollectionBasedSelected}
					onChange={() => handleChange('COLLECTION_BASED')}
				>
					<Heading size="xs">{'Collection Based'}</Heading>
					<Text size="xs" variant="muted">
						{"Creates a series from the top-most level of the library's directory."}
					</Text>
				</LibraryPatternRadio>
			</div>
			<Text size="xs" variant="muted">
				{'Not sure which to choose? '}
				<Link href="https://stumpapp.dev/guides/libraries#library-patterns">
					{t('Click here to learn more.')}
				</Link>
				{<i> You cannot change this setting later.</i>}
			</Text>
		</div>
	)
}

type LibraryPatternRadioProps = {
	selected: boolean
	onChange: () => void
	children: React.ReactNode
}

function LibraryPatternRadio({ selected, onChange, children }: LibraryPatternRadioProps) {
	return (
		<div
			className={cx(
				'cursor-pointer rounded-md border-[1.5px] p-4 text-center transition-colors duration-200 hover:border-brand dark:hover:border-brand',
				{
					'border-gray-75 dark:border-gray-800': !selected,
				},
				{
					'border-brand': selected,
				},
			)}
			onClick={onChange}
		>
			{children}
		</div>
	)
}
