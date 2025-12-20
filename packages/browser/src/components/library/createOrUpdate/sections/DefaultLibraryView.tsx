import { Heading, RadioGroup, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LibraryViewMode } from '@stump/sdk'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

export default function DefaultLibraryView() {
	const form = useFormContext()
	const { t } = useLocaleContext()

	const viewMode: LibraryViewMode = form.watch('default_library_view_mode')
	const isSeriesSelected = viewMode === 'SERIES'

	const handleChange = useCallback(
		(mode: LibraryViewMode) => {
			form.setValue('default_library_view_mode', mode)
		},
		[form],
	)

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('label'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<div className="flex flex-col gap-y-4">
				<input type="hidden" {...form.register('default_library_view_mode')} />

				<RadioGroup
					value={viewMode}
					onValueChange={handleChange}
					className="mt-1 flex flex-col sm:flex-row"
				>
					<RadioGroup.CardItem
						label={t(getOptionKey('series.label'))}
						description={t(getOptionKey('series.description'))}
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
						isActive={isSeriesSelected}
						value="SERIES"
						className="md:w-1/2"
					/>

					<RadioGroup.CardItem
						label={t(getOptionKey('books.label'))}
						description={t(getOptionKey('books.description'))}
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
						isActive={!isSeriesSelected}
						value="BOOKS"
						className="md:w-1/2"
					/>
				</RadioGroup>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.defaultLibraryView'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (key: string) => getKey(`options.${key}`)
