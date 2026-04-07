import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { Ellipsis } from 'lucide-react-native'
import { useState } from 'react'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import { HeaderButton } from '~/components/ui/header-button/header-button'
import { useTranslate } from '~/lib/hooks'
import { BookPreferences, useBookPreferences } from '~/stores/reader'

import { PagedActionMenuProps } from './types'

export function PagedActionMenu({
	book,
	serverId,
	onResetTimer,
	onShowSettings,
}: PagedActionMenuProps) {
	const { t } = useTranslate()
	const [isOpen, setIsOpen] = useState(false)

	const {
		preferences: { readingDirection, readingMode, trackElapsedTime },
		overrideGlobalSettings,
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences({ book, serverId })

	const handleUpdateSettings = (updates: Partial<BookPreferences>) => {
		if (overrideGlobalSettings) {
			return setBookPreferences(updates)
		} else {
			return updateGlobalSettings(updates)
		}
	}

	// TODO: Consider using expo/ui, see if I can replicate the pickers with icons
	return (
		<NativeDropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
			<NativeDropdownMenu.Trigger>
				<HeaderButton
					icon={{ ios: 'ellipsis', android: Ellipsis }}
					ios={{
						variant: 'glass',
					}}
				/>
			</NativeDropdownMenu.Trigger>

			<NativeDropdownMenu.Content>
				<NativeDropdownMenu.Group>
					<NativeDropdownMenu.Sub>
						<NativeDropdownMenu.SubTrigger key="preset">
							<NativeDropdownMenu.ItemTitle>
								{t('readerSettings.readingMode.label')}
							</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'book.pages' }} />
						</NativeDropdownMenu.SubTrigger>

						<NativeDropdownMenu.SubContent>
							<NativeDropdownMenu.CheckboxItem
								key="standard"
								value={readingMode === ReadingMode.Paged}
								onValueChange={() => handleUpdateSettings({ readingMode: ReadingMode.Paged })}
							>
								<NativeDropdownMenu.ItemTitle>
									{t('readerSettings.readingMode.options.PAGED')}
								</NativeDropdownMenu.ItemTitle>
							</NativeDropdownMenu.CheckboxItem>

							<NativeDropdownMenu.CheckboxItem
								key="hscroll"
								value={readingMode === ReadingMode.ContinuousHorizontal}
								onValueChange={() =>
									handleUpdateSettings({ readingMode: ReadingMode.ContinuousHorizontal })
								}
							>
								<NativeDropdownMenu.ItemTitle>
									{t('readerSettings.readingMode.options.CONTINUOUS_HORIZONTAL')}
								</NativeDropdownMenu.ItemTitle>
							</NativeDropdownMenu.CheckboxItem>

							<NativeDropdownMenu.CheckboxItem
								key="vscroll"
								value={readingMode === ReadingMode.ContinuousVertical}
								onValueChange={() =>
									handleUpdateSettings({ readingMode: ReadingMode.ContinuousVertical })
								}
							>
								<NativeDropdownMenu.ItemTitle>
									{t('readerSettings.readingMode.options.CONTINUOUS_VERTICAL')}
								</NativeDropdownMenu.ItemTitle>
							</NativeDropdownMenu.CheckboxItem>
						</NativeDropdownMenu.SubContent>
					</NativeDropdownMenu.Sub>

					<NativeDropdownMenu.Item
						key="readingDirection"
						onSelect={() =>
							handleUpdateSettings({
								readingDirection:
									readingDirection === ReadingDirection.Ltr
										? ReadingDirection.Rtl
										: ReadingDirection.Ltr,
							})
						}
					>
						<NativeDropdownMenu.ItemTitle>
							{t('readerSettings.readingDirection.label')}
						</NativeDropdownMenu.ItemTitle>
						<NativeDropdownMenu.ItemIcon
							ios={{
								name:
									readingDirection === ReadingDirection.Ltr
										? 'arrow.right.square'
										: 'arrow.backward.square',
							}}
						/>
					</NativeDropdownMenu.Item>

					{onResetTimer && (
						<NativeDropdownMenu.Sub>
							<NativeDropdownMenu.SubTrigger key="preset">
								<NativeDropdownMenu.ItemTitle>
									{t('readerSettings.readingTimer.label')}
								</NativeDropdownMenu.ItemTitle>
								<NativeDropdownMenu.ItemIcon
									ios={{
										name: 'timer',
									}}
								/>
							</NativeDropdownMenu.SubTrigger>

							<NativeDropdownMenu.SubContent>
								<NativeDropdownMenu.CheckboxItem
									key="enabled"
									value={!!trackElapsedTime}
									onValueChange={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}
								>
									<NativeDropdownMenu.ItemTitle>{t('common.enabled')}</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.CheckboxItem>
								<NativeDropdownMenu.Item
									key="reset"
									destructive
									disabled={!trackElapsedTime || !onResetTimer}
									onSelect={onResetTimer}
								>
									<NativeDropdownMenu.ItemTitle>
										{t('readerSettings.readingTimer.resetTimer')}
									</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.Item>
							</NativeDropdownMenu.SubContent>
						</NativeDropdownMenu.Sub>
					)}
				</NativeDropdownMenu.Group>

				{onShowSettings && (
					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.Item key="globalSettings" onSelect={onShowSettings}>
							<NativeDropdownMenu.ItemTitle>
								{t('readerSettings.allSettings')}
							</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon
								ios={{
									name: 'slider.horizontal.3',
								}}
							/>
						</NativeDropdownMenu.Item>
					</NativeDropdownMenu.Group>
				)}
			</NativeDropdownMenu.Content>
		</NativeDropdownMenu.Root>
	)
}
