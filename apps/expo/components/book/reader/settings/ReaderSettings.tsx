import { ReadingMode } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { CardList, CardRow, Switch } from '~/components/ui'
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
	const store = useReaderStore((state) => state)

	const bookSettings = useMemo(
		() => (forBook ? store.bookSettings[forBook] : undefined),
		[store.bookSettings, forBook],
	)

	const activeSettings = useMemo(
		() => bookSettings || store.globalSettings,
		[bookSettings, store.globalSettings],
	)

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!forBook || !forServer) return

			if (!bookSettings) {
				store.addBookSettings(forBook, {
					...store.globalSettings,
					...updates,
					serverID: forServer,
				})
			} else {
				store.setBookSettings(forBook, { ...updates, serverID: forServer })
			}
		},
		[forBook, bookSettings, store, forServer],
	)

	const onPreferenceChange = useCallback(
		(partial: Partial<GlobalSettings>) => {
			if (!forBook || !forServer) {
				store.setGlobalSettings(partial)
			} else {
				setBookPreferences(partial)
			}
		},
		[forBook, forServer, setBookPreferences, store],
	)

	const allowDownscaling = activeSettings.allowDownscaling ?? true

	return (
		<View className="flex-1 gap-8">
			<CardList label="Mode">
				<CardRow label="Flow">
					<ReadingModeSelect
						mode={activeSettings.readingMode}
						onChange={(mode) => onPreferenceChange({ readingMode: mode })}
					/>
				</CardRow>

				<CardRow
					label="Direction"
					disabled={activeSettings.readingMode === ReadingMode.ContinuousVertical}
				>
					<ReadingDirectionSelect
						direction={activeSettings.readingDirection}
						onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
					/>
				</CardRow>
			</CardList>

			<CardList label="Image Options">
				<CardRow label="Double Paged">
					<DoublePageSelect
						behavior={activeSettings.doublePageBehavior || 'auto'}
						onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
					/>
				</CardRow>

				<CardRow
					label="Separate Second Page"
					disabled={activeSettings.doublePageBehavior === 'off'}
				>
					<Switch
						checked={
							activeSettings.secondPageSeparate && activeSettings.doublePageBehavior !== 'off'
						}
						onCheckedChange={(value) => onPreferenceChange({ secondPageSeparate: value })}
					/>
				</CardRow>

				<CardRow label="Scaling">
					<ImageScalingSelect
						behavior={activeSettings.imageScaling.scaleToFit}
						onChange={(fit) => onPreferenceChange({ imageScaling: { scaleToFit: fit } })}
					/>
				</CardRow>

				<CardRow label="Downscaling">
					<Switch
						checked={allowDownscaling}
						onCheckedChange={(value) => onPreferenceChange({ allowDownscaling: value })}
					/>
				</CardRow>

				{/* TODO: https://docs.expo.dev/versions/latest/sdk/media-library/ */}
				<CardRow label="Panel Downloads" disabled>
					<Switch checked={false} onCheckedChange={() => {}} />
				</CardRow>
			</CardList>

			<CardList label="Navigation">
				<CardRow label="Tap Sides to Navigate">
					<Switch
						variant="brand"
						checked={activeSettings.tapSidesToNavigate ?? true}
						onCheckedChange={(checked) => onPreferenceChange({ tapSidesToNavigate: checked })}
					/>
				</CardRow>

				<CardRow label="Bottom Controls">
					<FooterControlsSelect
						variant={activeSettings.footerControls || 'images'}
						onChange={(variant) => onPreferenceChange({ footerControls: variant })}
					/>
				</CardRow>
			</CardList>
		</View>
	)
}
