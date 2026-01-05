import { ReadingMode } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { CardList, Switch, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
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
				<ReadingModeSelect
					mode={activeSettings.readingMode}
					onChange={(mode) => onPreferenceChange({ readingMode: mode })}
				/>
				{activeSettings.readingMode !== ReadingMode.ContinuousVertical && (
					<ReadingDirectionSelect
						direction={activeSettings.readingDirection}
						onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
					/>
				)}
			</CardList>

			<CardList label="Image Options">
				<DoublePageSelect
					behavior={activeSettings.doublePageBehavior || 'auto'}
					onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
				/>

				<View
					className={cn('flex flex-row items-center justify-between p-4', {
						'opacity-50': activeSettings.doublePageBehavior === 'off',
					})}
				>
					<Text>Separate Second Page</Text>

					<Switch
						checked={
							activeSettings.secondPageSeparate && activeSettings.doublePageBehavior !== 'off'
						}
						onCheckedChange={(value) => onPreferenceChange({ secondPageSeparate: value })}
					/>
				</View>

				<ImageScalingSelect
					behavior={activeSettings.imageScaling.scaleToFit}
					onChange={(fit) => onPreferenceChange({ imageScaling: { scaleToFit: fit } })}
				/>

				<View className="flex flex-row items-center justify-between p-4">
					<Text>Downscaling</Text>

					<Switch
						checked={allowDownscaling}
						onCheckedChange={(value) => onPreferenceChange({ allowDownscaling: value })}
					/>
				</View>

				{/* TODO: https://docs.expo.dev/versions/latest/sdk/media-library/ */}
				<View className="flex flex-row items-center justify-between p-4 opacity-50">
					<Text>Panel Downloads</Text>

					<Switch checked={false} onCheckedChange={() => {}} />
				</View>
			</CardList>

			<CardList label="Navigation">
				<View className="flex flex-row items-center justify-between p-4">
					<Text>Tap Sides to Navigate</Text>
					<Switch
						variant="brand"
						checked={activeSettings.tapSidesToNavigate ?? true}
						onCheckedChange={(checked) => onPreferenceChange({ tapSidesToNavigate: checked })}
					/>
				</View>

				<FooterControlsSelect
					variant={activeSettings.footerControls || 'images'}
					onChange={(variant) => onPreferenceChange({ footerControls: variant })}
				/>
			</CardList>
		</View>
	)
}
