import { Fragment, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Card, Switch, Text } from '~/components/ui'
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

	return (
		<View className="flex-1 gap-8">
			<View>
				<Text className="mb-3 text-foreground-muted">Mode</Text>

				<Card className="flex rounded-xl border border-edge bg-background-surface">
					<ReadingModeSelect
						mode={activeSettings.readingMode}
						onChange={(mode) => onPreferenceChange({ readingMode: mode })}
					/>

					{activeSettings.readingMode !== 'continuous:vertical' && (
						<Fragment>
							<View className="h-px w-full bg-edge" />

							<ReadingDirectionSelect
								direction={activeSettings.readingDirection}
								onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
							/>
						</Fragment>
					)}
				</Card>
			</View>

			<View>
				<Text className="mb-3 text-foreground-muted">Image Options</Text>

				<Card className="flex rounded-xl border border-edge bg-background-surface">
					<DoublePageSelect
						behavior={activeSettings.doublePageBehavior || 'auto'}
						onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
					/>

					<View className="h-px w-full bg-edge" />

					<ImageScalingSelect
						behavior={activeSettings.imageScaling.scaleToFit}
						onChange={(fit) => onPreferenceChange({ imageScaling: { scaleToFit: fit } })}
					/>

					<View className="h-px w-full bg-edge" />

					<View className="flex flex-row items-center justify-between p-4">
						<Text>Download Panel</Text>

						<Switch checked={false} onCheckedChange={() => {}} />
					</View>
				</Card>
			</View>

			<View>
				<Text className="mb-3 text-foreground-muted">Navigation</Text>

				<Card className="flex rounded-xl border border-edge bg-background-surface">
					<View className="flex flex-row items-center justify-between border-b border-b-edge p-4">
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
				</Card>
			</View>
		</View>
	)
}
