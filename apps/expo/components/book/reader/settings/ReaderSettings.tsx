import { ReadingMode } from '@stump/graphql'
import { Fragment, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Card, Switch, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { BookPreferences, GlobalSettings, useReaderStore } from '~/stores/reader'

import CachePolicySelect from './CachePolicySelect'
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

	const allowDownscaling = activeSettings.allowDownscaling ?? true

	return (
		<View className="flex-1 gap-8">
			<View>
				<Text className="mb-3 text-foreground-muted">Mode</Text>

				<Card className="flex rounded-xl border border-edge bg-background-surface">
					<ReadingModeSelect
						mode={activeSettings.readingMode}
						onChange={(mode) => onPreferenceChange({ readingMode: mode })}
					/>

					{activeSettings.readingMode !== ReadingMode.ContinuousVertical && (
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
					<CachePolicySelect
						policy={activeSettings.cachePolicy || 'memory-disk'}
						onChange={(policy) => onPreferenceChange({ cachePolicy: policy })}
					/>

					<View className="h-px w-full bg-edge" />

					<DoublePageSelect
						behavior={activeSettings.doublePageBehavior || 'auto'}
						onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
					/>

					<View className="h-px w-full bg-edge" />

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

					<View className="h-px w-full bg-edge" />

					<ImageScalingSelect
						behavior={activeSettings.imageScaling.scaleToFit}
						onChange={(fit) => onPreferenceChange({ imageScaling: { scaleToFit: fit } })}
					/>

					<View className="h-px w-full bg-edge" />

					<View className="flex flex-row items-center justify-between p-4">
						<Text>Downscaling</Text>

						<Switch
							checked={allowDownscaling}
							onCheckedChange={(value) => onPreferenceChange({ allowDownscaling: value })}
						/>
					</View>

					<View className="h-px w-full bg-edge" />

					{/* TODO: https://docs.expo.dev/versions/latest/sdk/media-library/ */}
					<View className="flex flex-row items-center justify-between p-4 opacity-50">
						<Text>Panel Downloads</Text>

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
