import { Heading, RadioGroup, Text, WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LibraryViewMode } from '@stump/sdk'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

export default function DefaultLibraryView() {
	const form = useFormContext()
	const { t } = useLocaleContext()

	const viewMode: LibraryViewMode = form.watch('default_library_view_mode')
	const hideSeriesView: boolean = form.watch('hide_series_view')
	const isSeriesSelected = viewMode === 'SERIES'

	const handleChange = useCallback(
		(mode: LibraryViewMode) => {
			form.setValue('default_library_view_mode', mode)
		},
		[form],
	)

	const handleHideSeriesViewChange = useCallback(
		(checked: boolean) => {
			form.setValue('hide_series_view', checked)
			// If hiding series view and current default is SERIES, switch to BOOKS
			// This is needed as if this is not done, the view mode will be SERIES, but the
			// series tab will not be visible. Leading to a funny bug
			if (checked && viewMode === 'SERIES') {
				form.setValue('default_library_view_mode', 'BOOKS')
			}
		},
		[form, viewMode],
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

				{!hideSeriesView && (
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
				)}

				<WideSwitch
					label={t(getKey('hideSeriesView.label'))}
					description={t(getKey('hideSeriesView.description'))}
					checked={hideSeriesView}
					onCheckedChange={handleHideSeriesViewChange}
				/>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.defaultLibraryView'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (key: string) => getKey(`options.${key}`)
