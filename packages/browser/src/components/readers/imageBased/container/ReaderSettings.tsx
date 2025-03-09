import { BookPreferences } from '@stump/client'
import { Label, RawSwitch } from '@stump/components'
import { ReadingMode } from '@stump/sdk'
import omit from 'lodash/omit'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useReaderStore } from '@/stores'

import DoubleSpreadBehavior from './DoubleSpreadBehavior'
import ImageScalingSelect from './ImageScalingSelect'
import ReadingDirectionSelect from './ReadingDirectionSelect'
import ReadingModeSelect from './ReadingModeSelect'

type Props = {
	forBook?: string
	currentPage?: number
}

export default function ReaderSettings({ forBook, currentPage }: Props) {
	const [search, setSearch] = useSearchParams()

	const store = useReaderStore((state) => state)

	const bookSettings = useMemo(
		() => (forBook ? store.bookPreferences[forBook] : undefined),
		[store.bookPreferences, forBook],
	)

	const activeSettings = useMemo(
		() => bookSettings || store.settings,
		[bookSettings, store.settings],
	)

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!forBook) return

			if (!bookSettings) {
				store.setBookPreferences(forBook, {
					...omit(store.settings, ['showToolBar', 'preload']),
					...updates,
				})
			} else {
				store.setBookPreferences(forBook, { ...bookSettings, ...updates })
			}
		},
		[forBook, bookSettings, store],
	)

	const onPreferenceChange = useCallback(
		(partial: Partial<BookPreferences>) => {
			if (!forBook) {
				store.setSettings(partial)
			} else {
				setBookPreferences(partial)
			}
		},
		[forBook, setBookPreferences, store],
	)

	const currentReadingMode = activeSettings.readingMode || 'paged'
	const onChangeReadingMode = useCallback(
		(value: ReadingMode) => {
			if (currentPage != null) {
				// We need to set the page in the URL for the paged reader to start at the correct
				// page but remove the page from the URL for the continuous readers
				const urlPage = currentReadingMode.startsWith('continuous') ? currentPage.toString() : null
				if (urlPage) {
					search.set('page', urlPage)
				} else {
					search.delete('page')
				}
				setSearch(search)
			}
			setBookPreferences({ readingMode: value })
		},
		[search, setSearch, setBookPreferences, currentReadingMode, currentPage],
	)

	return (
		<div className="flex flex-col gap-4" key={forBook}>
			<div>
				<Label className="text-xs font-medium uppercase text-foreground-muted">Mode</Label>

				<ReadingModeSelect
					value={activeSettings.readingMode || 'paged'}
					onChange={onChangeReadingMode}
				/>

				<ReadingDirectionSelect
					direction={activeSettings.readingDirection || 'ltr'}
					onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
				/>

				<Label className="flex items-center justify-between px-1 pt-4">
					<span>Tap sides to navigate</span>
					<RawSwitch
						primaryRing
						variant="primary"
						checked={activeSettings.tapSidesToNavigate}
						onCheckedChange={(checked) => onPreferenceChange({ tapSidesToNavigate: checked })}
					/>
				</Label>
			</div>

			<div>
				<Label className="text-xs font-medium uppercase text-foreground-muted">Image Options</Label>

				<DoubleSpreadBehavior
					behavior={activeSettings.doublePageBehavior || 'auto'}
					onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
				/>

				<ImageScalingSelect
					value={activeSettings.imageScaling?.scaleToFit}
					onChange={(value) =>
						onPreferenceChange({
							imageScaling: {
								scaleToFit: value,
							},
						})
					}
				/>
			</div>

			{/* <ImageScalingSelect />
			{renderDoubleSpreadOption()}
			<ReadingModeSelect />
			{renderDirectionalOptions()}
			<BrightnessControl /> */}
		</div>
	)
}
