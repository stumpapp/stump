import { BookPreferences, DEFAULT_BOOK_PREFERENCES } from '@stump/client'
import { Input, NewCard, RawSwitch } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import omit from 'lodash/omit'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { useReaderStore } from '@/stores'

import DoubleSpreadBehavior from './DoubleSpreadBehavior'
import ImageScalingSelect from './ImageScalingSelect'
import ReadingDirectionSelect from './ReadingDirectionSelect'
import ReadingModeSelect from './ReadingModeSelect'

// locale org is a bit fucked after years of changes but it's fine lol
const getSettingsKey = (key: string) => `imageReader.settings.${key}`
const getSectionKey = (key: string) => `imageReader.settings.readerSettings.sections.${key}`
const getSettingsSceneKey = (key: string) =>
	`settingsScene.app/reader.sections.imageBasedBooks.sections.${key}`

type Props = {
	forBook?: string
	currentPage?: number
}

export default function ReaderSettings({ forBook, currentPage }: Props) {
	const { t } = useLocaleContext()
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

	const currentReadingMode = activeSettings.readingMode || ReadingMode.Paged
	const onChangeReadingModeForBook = useCallback(
		(value: ReadingMode) => {
			if (currentPage != null) {
				// We need to set the page in the URL for the paged reader to start at the correct
				// page but remove the page from the URL for the continuous readers
				// const urlPage = currentReadingMode.startsWith('continuous') ? currentPage.toString() : null
				let urlPage: string | null = null
				if (currentReadingMode !== ReadingMode.Paged && !store.settings.animatedReader) {
					urlPage = currentPage?.toString()
				}
				if (urlPage) {
					search.set('page', urlPage)
				} else {
					search.delete('page')
				}
				setSearch(search, { replace: true })
			}
			setBookPreferences({ readingMode: value })
		},
		[search, setSearch, setBookPreferences, currentReadingMode, currentPage, store],
	)

	const onChangeReadingMode = useCallback(
		(value: ReadingMode) => {
			if (!forBook) {
				store.setSettings({ readingMode: value })
			} else {
				onChangeReadingModeForBook(value)
			}
		},
		[forBook, onChangeReadingModeForBook, store],
	)

	const onChangeExperimentalReader = useCallback(
		(checked: boolean) => {
			if (!forBook) {
				store.setSettings({ animatedReader: checked })
			}
		},
		[forBook, store],
	)

	const createNumberChangeHandler =
		(updater: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value

			if (!value) {
				return updater(0)
			}

			const parsed = parseInt(value)
			if (!isNaN(parsed) && parsed >= 0) {
				return updater(parsed)
			}
		}

	return (
		<div className="gap-8 flex flex-col" key={forBook}>
			<NewCard label={t(getSectionKey('mode'))}>
				<NewCard.Row
					label={t(getSettingsKey('readingMode.label'))}
					className="flex-row items-center"
				>
					<ReadingModeSelect
						value={activeSettings.readingMode || DEFAULT_BOOK_PREFERENCES.readingMode}
						onChange={onChangeReadingMode}
					/>
				</NewCard.Row>

				<NewCard.Row
					label={t(getSettingsKey('readingDirection.label'))}
					className="flex-row items-center"
				>
					<ReadingDirectionSelect
						direction={activeSettings.readingDirection || DEFAULT_BOOK_PREFERENCES.readingDirection}
						onChange={(direction) => onPreferenceChange({ readingDirection: direction })}
					/>
				</NewCard.Row>
			</NewCard>

			<NewCard label={t(getSectionKey('imageOptions'))}>
				<NewCard.Row
					label={t(getSettingsKey('doublePageBehavior.label'))}
					className="flex-row items-center"
				>
					<DoubleSpreadBehavior
						behavior={
							activeSettings.doublePageBehavior || DEFAULT_BOOK_PREFERENCES.doublePageBehavior
						}
						onChange={(behavior) => onPreferenceChange({ doublePageBehavior: behavior })}
					/>
				</NewCard.Row>

				<NewCard.Row label={t(getSettingsKey('readerSettings.preferences.separateSecondPage'))}>
					<RawSwitch
						checked={activeSettings.secondPageSeparate}
						onCheckedChange={(checked) => onPreferenceChange({ secondPageSeparate: checked })}
					/>
				</NewCard.Row>

				<NewCard.Row label={t(getSettingsKey('imageScaling.label'))}>
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
				</NewCard.Row>
			</NewCard>

			<NewCard label={t(getSectionKey('controls'))}>
				<NewCard.Row label={t(getSettingsKey('readerSettings.preferences.panZoomWithoutCtrl'))}>
					<RawSwitch
						checked={activeSettings.panzoomWithoutCtrl}
						onCheckedChange={(checked) => onPreferenceChange({ panzoomWithoutCtrl: checked })}
					/>
				</NewCard.Row>

				<NewCard.Row label={t(getSettingsKey('readerSettings.preferences.tapSidesToNavigate'))}>
					<RawSwitch
						checked={activeSettings.tapSidesToNavigate}
						onCheckedChange={(checked) => onPreferenceChange({ tapSidesToNavigate: checked })}
					/>
				</NewCard.Row>
			</NewCard>

			<NewCard label={t(getSectionKey('preferences'))}>
				<NewCard.Row label={t(getSettingsKey('readerSettings.preferences.readingTimer'))}>
					<RawSwitch
						checked={activeSettings.trackElapsedTime}
						onCheckedChange={(checked) => onPreferenceChange({ trackElapsedTime: checked })}
					/>
				</NewCard.Row>

				<NewCard.Row
					label={t(getSettingsSceneKey('preloadAheadCount.label'))}
					description={t(getSettingsSceneKey('preloadAheadCount.description'))}
				>
					<Input
						containerClassName="w-32"
						value={store.settings.preload.ahead}
						onChange={createNumberChangeHandler((n) =>
							store.setSettings({ preload: { ahead: n, behind: store.settings.preload.behind } }),
						)}
						type="number"
						min={0}
					/>
				</NewCard.Row>

				<NewCard.Row
					label={t(getSettingsSceneKey('preloadBehindCount.label'))}
					description={t(getSettingsSceneKey('preloadBehindCount.description'))}
				>
					<Input
						containerClassName="w-32"
						value={store.settings.preload.behind}
						onChange={createNumberChangeHandler((n) =>
							store.setSettings({ preload: { ahead: store.settings.preload.ahead, behind: n } }),
						)}
						type="number"
						min={0}
					/>
				</NewCard.Row>

				{/* TODO: Once UX for settings is settled remove this */}
				{!forBook && (
					<NewCard.Row label="Experimental animated reader">
						<RawSwitch
							checked={store.settings.animatedReader || false}
							onCheckedChange={(checked) => onChangeExperimentalReader(checked)}
						/>
					</NewCard.Row>
				)}
			</NewCard>
		</div>
	)
}
