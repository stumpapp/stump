import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { CircleEllipsis, Settings2, SquareArrowLeft, SquareArrowRight } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Switch,
	Text,
} from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { COLORS } from '~/lib/constants'
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

	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	return (
		<DropdownMenu onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					className="squircle p-1 tablet:p-2 h-[unset] w-[unset] rounded-full border"
					variant="ghost"
					size="icon"
					style={{
						backgroundColor: COLORS.dark.background.overlay.DEFAULT,
						borderColor: COLORS.dark.edge.DEFAULT,
					}}
				>
					{({ pressed }) => (
						<View
							className="squircle items-center justify-center rounded-full"
							style={{
								backgroundColor: COLORS.dark.background.overlay.DEFAULT,
								borderColor: COLORS.dark.edge.DEFAULT,
								height: 35,
								width: 35,
							}}
						>
							<Icon
								as={CircleEllipsis}
								size={24}
								style={{
									opacity: isOpen ? 0.8 : pressed ? 0.85 : 1,
									// @ts-expect-error: This is fine
									color: COLORS.dark.foreground.DEFAULT,
								}}
							/>
						</View>
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				insets={contentInsets}
				sideOffset={2}
				className="tablet:w-64 w-2/3"
				align="end"
			>
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="text-foreground">
							<Text className="text-lg">{t('readerSettings.readingMode.label')}</Text>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								value={readingMode}
								onValueChange={(value) => {
									handleUpdateSettings({ readingMode: value as ReadingMode })
								}}
							>
								<DropdownMenuRadioItem value={ReadingMode.Paged} className="text-foreground">
									<Text className="text-lg">{t('readerSettings.readingMode.options.PAGED')}</Text>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem
									value={ReadingMode.ContinuousHorizontal}
									className="text-foreground"
								>
									<Text className="text-lg">
										{t('readerSettings.readingMode.options.CONTINUOUS_HORIZONTAL')}
									</Text>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem
									value={ReadingMode.ContinuousVertical}
									className="text-foreground"
								>
									<Text className="text-lg">
										{t('readerSettings.readingMode.options.CONTINUOUS_VERTICAL')}
									</Text>
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-foreground"
					onPress={() =>
						handleUpdateSettings({
							readingDirection:
								readingDirection === ReadingDirection.Ltr
									? ReadingDirection.Rtl
									: ReadingDirection.Ltr,
						})
					}
				>
					<Text className="text-lg">{t('readerSettings.readingDirection.label')}</Text>
					<Icon
						as={readingDirection === ReadingDirection.Ltr ? SquareArrowRight : SquareArrowLeft}
						size={20}
						className="ml-auto text-foreground-muted"
					/>
				</DropdownMenuItem>
				<DropdownMenuSeparator />

				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="text-foreground">
						<Text className="text-lg">{t('readerSettings.readingTimer.label')}</Text>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem
							className="text-foreground"
							onPress={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}
							closeOnPress={false}
						>
							<Text className="text-lg">{t('common.enabled')}</Text>
							<View className="ml-auto">
								<Switch
									size="tiny"
									checked={trackElapsedTime}
									onCheckedChange={() =>
										setBookPreferences({ trackElapsedTime: !trackElapsedTime })
									}
								/>
							</View>
						</DropdownMenuItem>

						{onResetTimer && (
							<DropdownMenuItem
								className="text-foreground"
								disabled={!trackElapsedTime || !onResetTimer}
								onPress={onResetTimer}
							>
								<Text className="text-lg">{t('readerSettings.readingTimer.resetTimer')}</Text>
							</DropdownMenuItem>
						)}
					</DropdownMenuSubContent>
				</DropdownMenuSub>

				{onShowSettings && (
					<>
						<DropdownMenuSeparator variant="group" />

						<DropdownMenuItem className="text-foreground" onPress={onShowSettings}>
							<Text className="text-lg">{t('readerSettings.allSettings')}</Text>
							<Icon as={Settings2} size={20} className="ml-auto text-foreground-muted" />
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
