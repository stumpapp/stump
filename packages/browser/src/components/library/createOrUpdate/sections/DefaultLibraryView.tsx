import { Heading, RadioGroup, Text, WideSwitch } from '@stump/components'
import { LibraryViewMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

export default function DefaultLibraryView() {
	const form = useFormContext()
	const { t } = useLocaleContext()

	const viewMode: LibraryViewMode = form.watch('defaultLibraryViewMode')
	const hideSeriesView: boolean = form.watch('hideSeriesView')
	const isSeriesSelected = viewMode === LibraryViewMode.Series

	const handleViewModeChange = useCallback(
		(mode: LibraryViewMode) => {
			form.setValue('defaultLibraryViewMode', mode)
		},
		[form],
	)

	const handleHideSeriesChange = useCallback(
		(checked: boolean) => {
			form.setValue('hideSeriesView', checked)
		},
		[form],
	)

	useEffect(() => {
		if (hideSeriesView && viewMode === LibraryViewMode.Series) {
			form.setValue('defaultLibraryViewMode', LibraryViewMode.Books)
		}
	}, [hideSeriesView, viewMode, form])

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('label'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<div className="flex flex-col gap-y-4">
				<input type="hidden" {...form.register('defaultLibraryViewMode')} />

				<RadioGroup
					value={viewMode}
					onValueChange={handleViewModeChange}
					className="flex flex-col sm:flex-row"
					disabled={hideSeriesView}
					defaultValue={LibraryViewMode.Series}
				>
					<RadioGroup.CardItem
						label={t(getKey('options.series.label'))}
						description={t(getKey('options.series.description'))}
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
						isActive={isSeriesSelected && !hideSeriesView}
						value={LibraryViewMode.Series}
						className="md:w-1/2"
					/>

					<RadioGroup.CardItem
						label={t(getKey('options.books.label'))}
						description={t(getKey('options.books.description'))}
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
						isActive={!isSeriesSelected || hideSeriesView}
						value={LibraryViewMode.Books}
						className="md:w-1/2"
					/>
				</RadioGroup>

				<WideSwitch
					checked={hideSeriesView}
					onCheckedChange={handleHideSeriesChange}
					label={t(getKey('hideSeriesView.label'))}
					description={t(getKey('hideSeriesView.description'))}
				/>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.defaultLibraryView'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
