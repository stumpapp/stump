import { ReadingMode } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Card, Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { BookPreferences, GlobalSettings, useReaderStore } from '~/stores/reader'

import DoublePageSelect from './DoublePageSelect'
import FooterControlsSelect from './FootControlsSelect'
import ImageScalingSelect from './ImageScalingSelect'
import ReadingDirectionSelect from './ReadingDirectionSelect'
import ReadingModeSelect from './ReadingModeSelect'

type Props = {
	forBook?: string
	forServer?: string
}

// TODO(android): Use non-native dropdown for all of these

export default function ReaderSettings({ forBook, forServer }: Props) {
	const { t } = useTranslate()

	const bookSettingsMap = useReaderStore((state) => state.bookSettings)
	const globalSettings = useReaderStore((state) => state.globalSettings)
	const addBookSettings = useReaderStore((state) => state.addBookSettings)
	const setBookSettingsFn = useReaderStore((state) => state.setBookSettings)
	const setGlobalSettings = useReaderStore((state) => state.setGlobalSettings)

	const bookSettings = useMemo(
		() => (forBook ? bookSettingsMap[forBook] : undefined),
		[bookSettingsMap, forBook],
	)

	const activeSettings = useMemo(
		() => bookSettings || globalSettings,
		[bookSettings, globalSettings],
	)

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!forBook || !forServer) return

			if (!bookSettings) {
				addBookSettings(forBook, {
					...globalSettings,
					...updates,
					serverID: forServer,
				})
			} else {
				setBookSettingsFn(forBook, { ...updates, serverID: forServer })
			}
		},
		[forBook, bookSettings, addBookSettings, globalSettings, setBookSettingsFn, forServer],
	)

	const onPreferenceChange = useCallback(
		(partial: Partial<GlobalSettings>) => {
			if (!forBook || !forServer) {
				setGlobalSettings(partial)
			} else {
				setBookPreferences(partial)
			}
		},
		[forBook, forServer, setBookPreferences, setGlobalSettings],
	)

	const allowDownscaling = activeSettings.allowDownscaling ?? true

	return (
		<View className="gap-8 flex-1">
			<Card label={t('readerSettings.sections.mode')}>
				<Card.Row label={t('readerSettings.readingMode.label')}>
					<ReadingModeSelect
						mode={activeSettings.readingMode}
						onChange={(mode) => onPreferenceChange({ readingMode: mode })}
					/>
				</Card.Row>

				<Card.Row
					label={t('readerSettings.readingDirection.label')}
					disabled={activeSettings.readingMode === ReadingMode.ContinuousVertical}
				>
					<ReadingDirectionSelect
						direction={activeSettings.readingDirection}
						onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
					/>
				</Card.Row>
			</Card>

			<Card label={t('readerSettings.sections.imageOptions')}>
				<Card.Row label={t('readerSettings.doublePageBehavior.label')}>
					<DoublePageSelect
						behavior={activeSettings.doublePageBehavior || 'auto'}
						onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
					/>
				</Card.Row>

				<Card.Row
					label={t('readerSettings.separateSecondPage')}
					disabled={activeSettings.doublePageBehavior === 'off'}
				>
					<Switch
						checked={
							activeSettings.secondPageSeparate && activeSettings.doublePageBehavior !== 'off'
						}
						onCheckedChange={(value) => onPreferenceChange({ secondPageSeparate: value })}
					/>
				</Card.Row>

				<Card.Row label={t('readerSettings.imageScaling.label')}>
					<ImageScalingSelect
						behavior={activeSettings.imageScaling.scaleToFit}
						onChange={(fit) => onPreferenceChange({ imageScaling: { scaleToFit: fit } })}
					/>
				</Card.Row>

				<Card.Row label={t('readerSettings.allowDownscaling')}>
					<Switch
						checked={allowDownscaling}
						onCheckedChange={(value) => onPreferenceChange({ allowDownscaling: value })}
					/>
				</Card.Row>
			</Card>

			<Card label={t('readerSettings.sections.controls')}>
				<Card.Row label={t('readerSettings.tapSidesToNavigate')}>
					<Switch
						variant="brand"
						checked={activeSettings.tapSidesToNavigate ?? true}
						onCheckedChange={(checked) => onPreferenceChange({ tapSidesToNavigate: checked })}
					/>
				</Card.Row>

				<Card.Row label={t('readerSettings.footerControls.label')}>
					<FooterControlsSelect
						variant={activeSettings.footerControls || 'images'}
						onChange={(variant) => onPreferenceChange({ footerControls: variant })}
					/>
				</Card.Row>
			</Card>
		</View>
	)
}
