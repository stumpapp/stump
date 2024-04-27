import { Label, Link, RadioGroup, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LibraryPattern } from '@stump/types'
import { useFormContext } from 'react-hook-form'

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
		<div className="flex flex-col gap-y-1.5">
			<Label>Library pattern</Label>
			<Text size="sm" variant="muted">
				The library pattern determines how Stump will organize your library
			</Text>
			<input type="hidden" {...form.register('library_pattern')} />

			<RadioGroup
				value={libraryPattern}
				onValueChange={handleChange}
				className="mt-1 flex flex-col sm:flex-row"
			>
				<RadioGroup.CardItem
					label="Collection Based"
					description="Creates a series for each folder at the top-most level of the library root"
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={isCollectionBasedSelected}
					value="COLLECTION_BASED"
				/>

				<RadioGroup.CardItem
					label="Series Based"
					description="Creates a series for each folder recursively within the library path"
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={!isCollectionBasedSelected}
					value="SERIES_BASED"
				/>
			</RadioGroup>

			<Text size="xs" variant="muted">
				{'Not sure which to choose? '}
				<Link href="https://www.stumpapp.dev/guides/basics/libraries#supported-patterns">
					{t('Click here to learn more.')}
				</Link>
				{<i> You cannot change this setting later</i>}
			</Text>
		</div>
	)
}
