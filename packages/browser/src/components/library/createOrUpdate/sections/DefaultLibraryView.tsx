import { NewCard, RawSwitch, Select } from '@stump/components'
import { LibraryViewMode } from '@stump/graphql'
import { useCallback, useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

export default function DefaultLibraryView() {
	const form = useFormContext()
	const { t } = useTranslate()

	const [viewMode, hideSeriesView, skipBookOverview]: [LibraryViewMode, boolean, boolean] =
		useWatch({
			control: form.control,
			name: ['defaultLibraryViewMode', 'hideSeriesView', 'skipBookOverview'],
		})

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

	const handleSkipBookOverviewChange = useCallback(
		(checked: boolean) => {
			form.setValue('skipBookOverview', checked)
		},
		[form],
	)

	useEffect(() => {
		if (hideSeriesView && viewMode === LibraryViewMode.Series) {
			form.setValue('defaultLibraryViewMode', LibraryViewMode.Books)
		}
	}, [hideSeriesView, viewMode, form])

	return (
		<NewCard label={t(getKey('label'))}>
			<NewCard.Row
				label={t(getKey('defaultTab.label'))}
				description={t(getKey('defaultTab.description'))}
			>
				<div>
					<Select value={viewMode} onValueChange={handleViewModeChange}>
						<Select.Trigger size="sm">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{[LibraryViewMode.Books, LibraryViewMode.Series].map((mode) => (
								<Select.Item
									key={mode}
									value={mode}
									disabled={mode === LibraryViewMode.Series && hideSeriesView}
								>
									{t(getKey(`defaultTab.options.${mode}`))}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				</div>
			</NewCard.Row>

			<NewCard.Row
				label={t(getKey('hideSeries.label'))}
				description={t(getKey('hideSeries.description'))}
			>
				<RawSwitch checked={hideSeriesView} onCheckedChange={handleHideSeriesChange} />
			</NewCard.Row>

			<NewCard.Row
				label={t(getKey('skipBookOverview.label'))}
				description={t(getKey('skipBookOverview.description'))}
			>
				<RawSwitch checked={skipBookOverview} onCheckedChange={handleSkipBookOverviewChange} />
			</NewCard.Row>
		</NewCard>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.viewOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
