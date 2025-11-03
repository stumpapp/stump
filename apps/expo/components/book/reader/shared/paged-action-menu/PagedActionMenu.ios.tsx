import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { Ellipsis } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import { HeaderButton } from '~/components/ui/header-button/header-button'
import { useBookPreferences } from '~/stores/reader'

import { PagedActionMenuProps } from './types'

export function PagedActionMenu({
	incognito,
	book,
	serverId,
	onResetTimer,
	onChangeReadingDirection,
	onShowSettings,
}: PagedActionMenuProps) {
	const [isOpen, setIsOpen] = useState(false)

	const {
		preferences: { readingDirection, readingMode, trackElapsedTime },
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences({ book, serverId })

	const handleChangeReadingDirection = useCallback(() => {
		setBookPreferences({
			readingDirection:
				readingDirection === ReadingDirection.Ltr ? ReadingDirection.Rtl : ReadingDirection.Ltr,
		})
		onChangeReadingDirection?.()
	}, [readingDirection, setBookPreferences, onChangeReadingDirection])

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
							<NativeDropdownMenu.ItemTitle>Presets</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'slider.horizontal.below.rectangle' }} />
						</NativeDropdownMenu.SubTrigger>

						<NativeDropdownMenu.SubContent>
							<NativeDropdownMenu.CheckboxItem
								key="standard"
								value={readingMode === ReadingMode.Paged}
								onValueChange={() => setBookPreferences({ readingMode: ReadingMode.Paged })}
							>
								<NativeDropdownMenu.ItemTitle>Paged</NativeDropdownMenu.ItemTitle>
							</NativeDropdownMenu.CheckboxItem>

							<NativeDropdownMenu.CheckboxItem
								key="hscroll"
								value={readingMode === ReadingMode.ContinuousHorizontal}
								onValueChange={() =>
									setBookPreferences({ readingMode: ReadingMode.ContinuousHorizontal })
								}
							>
								<NativeDropdownMenu.ItemTitle>Horizontal Scroll</NativeDropdownMenu.ItemTitle>
							</NativeDropdownMenu.CheckboxItem>

							<NativeDropdownMenu.CheckboxItem
								key="vscroll"
								value={readingMode === ReadingMode.ContinuousVertical}
								onValueChange={() =>
									setBookPreferences({ readingMode: ReadingMode.ContinuousVertical })
								}
							>
								<NativeDropdownMenu.ItemTitle>Vertical Scroll</NativeDropdownMenu.ItemTitle>
							</NativeDropdownMenu.CheckboxItem>
						</NativeDropdownMenu.SubContent>
					</NativeDropdownMenu.Sub>

					<NativeDropdownMenu.CheckboxItem
						key="incognito"
						value={!!incognito}
						onValueChange={() => updateGlobalSettings({ incognito: !incognito })}
					>
						<NativeDropdownMenu.ItemIndicator />
						<NativeDropdownMenu.ItemTitle>Incognito</NativeDropdownMenu.ItemTitle>
						<NativeDropdownMenu.ItemIcon
							ios={{ name: incognito ? 'eyeglasses.slash' : 'eyeglasses' }}
						/>
					</NativeDropdownMenu.CheckboxItem>

					<NativeDropdownMenu.Item key="readingDirection" onSelect={handleChangeReadingDirection}>
						<NativeDropdownMenu.ItemTitle>Reading Direction</NativeDropdownMenu.ItemTitle>
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
								<NativeDropdownMenu.ItemTitle>Reading Timer</NativeDropdownMenu.ItemTitle>
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
									<NativeDropdownMenu.ItemTitle>Enabled</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.CheckboxItem>
								<NativeDropdownMenu.Item
									key="reset"
									destructive
									disabled={!trackElapsedTime || !onResetTimer}
									onSelect={onResetTimer}
								>
									<NativeDropdownMenu.ItemTitle>Reset Timer</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.Item>
							</NativeDropdownMenu.SubContent>
						</NativeDropdownMenu.Sub>
					)}
				</NativeDropdownMenu.Group>

				{onShowSettings && (
					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.Item key="globalSettings" onSelect={onShowSettings}>
							<NativeDropdownMenu.ItemTitle>Preferences</NativeDropdownMenu.ItemTitle>
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
