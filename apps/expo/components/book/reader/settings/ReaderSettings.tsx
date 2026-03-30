import { ReadingMode } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Card, Switch } from '~/components/ui'
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
		<View className="flex-1 gap-8">
			<Card label="Mode">
				<Card.Row label="Flow">
					<ReadingModeSelect
						mode={activeSettings.readingMode}
						onChange={(mode) => onPreferenceChange({ readingMode: mode })}
					/>
				</Card.Row>

				<Card.Row
					label="Direction"
					disabled={activeSettings.readingMode === ReadingMode.ContinuousVertical}
				>
					<ReadingDirectionSelect
						direction={activeSettings.readingDirection}
						onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
					/>
				</Card.Row>
			</Card>

			<Card label="Image Options">
				<Card.Row label="Double Paged">
					<DoublePageSelect
						behavior={activeSettings.doublePageBehavior || 'auto'}
						onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
					/>
				</Card.Row>

				<Card.Row
					label="Separate Second Page"
					disabled={activeSettings.doublePageBehavior === 'off'}
				>
					<Switch
						checked={
							activeSettings.secondPageSeparate && activeSettings.doublePageBehavior !== 'off'
						}
						onCheckedChange={(value) => onPreferenceChange({ secondPageSeparate: value })}
					/>
				</Card.Row>

				<Card.Row label="Scaling">
					<ImageScalingSelect
						behavior={activeSettings.imageScaling.scaleToFit}
						onChange={(fit) => onPreferenceChange({ imageScaling: { scaleToFit: fit } })}
					/>
				</Card.Row>

				<Card.Row label="Downscaling">
					<Switch
						checked={allowDownscaling}
						onCheckedChange={(value) => onPreferenceChange({ allowDownscaling: value })}
					/>
				</Card.Row>

				{/* TODO: https://docs.expo.dev/versions/latest/sdk/media-library/ */}
				<Card.Row label="Panel Downloads" disabled>
					<Switch checked={false} onCheckedChange={() => {}} />
				</Card.Row>
			</Card>

			<Card label="Navigation">
				<Card.Row label="Tap Sides to Navigate">
					<Switch
						variant="brand"
						checked={activeSettings.tapSidesToNavigate ?? true}
						onCheckedChange={(checked) => onPreferenceChange({ tapSidesToNavigate: checked })}
					/>
				</Card.Row>

				<Card.Row label="Bottom Controls">
					<FooterControlsSelect
						variant={activeSettings.footerControls || 'images'}
						onChange={(variant) => onPreferenceChange({ footerControls: variant })}
					/>
				</Card.Row>
			</Card>
		</View>
	)
}
