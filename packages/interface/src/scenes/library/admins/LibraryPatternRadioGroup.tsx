import { Label, Link, RadioGroup, Text } from '@stump/components'
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

			<RadioGroup
				value={libraryPattern}
				onValueChange={handleChange}
				className="mt-1 flex flex-col sm:flex-row"
			>
				<RadioGroup.CardItem
					label="Collection Based"
					description="Creates a series from the top-most level of the library's directory."
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={isCollectionBasedSelected}
					value="COLLECTION_BASED"
				/>

				<RadioGroup.CardItem
					label="Series Based"
					description="Creates a series from the bottom-most level of the library's directory."
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={!isCollectionBasedSelected}
					value="SERIES_BASED"
				/>
			</RadioGroup>

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
