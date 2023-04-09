import { cx, Heading, Label, Link, Text } from '@stump/components'
import { LibraryPattern } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { useLocaleContext } from '../../../i18n/context'

// TODO: disable this if the library is being updated, I don't support changing patterns (yet?)
export default function LibraryPatternRadioGroup() {
	const form = useFormContext()

	const { t } = useLocaleContext()

	const libraryPattern: LibraryPattern = form.watch('library_pattern')
	const isCollectionBasedSelected = libraryPattern === 'COLLECTION_BASED'

	const handleChange = (pattern: LibraryPattern) => {
		form.setValue('library_pattern', pattern)
	}

	return (
		<div className="flex flex-col gap-2 py-2">
			<Label>Library Pattern</Label>
			<input type="hidden" {...form.register('library_pattern')} />

			<div className="flex gap-12">
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

			<Text size="xs" variant="muted" className="mt-1">
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
				'flex cursor-pointer flex-col gap-3 rounded-md border-2 p-4 text-left transition-colors duration-200 hover:border-brand dark:hover:border-brand',
				{
					'border-gray-100 dark:border-gray-800': !selected,
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
