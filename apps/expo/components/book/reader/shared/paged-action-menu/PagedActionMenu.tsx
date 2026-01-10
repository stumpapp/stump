import { ReadingDirection, ReadingMode } from '@stump/graphql'
import {
	CircleEllipsis,
	Glasses,
	Settings2,
	SquareArrowLeft,
	SquareArrowRight,
} from 'lucide-react-native'
import { useCallback, useState } from 'react'
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
					className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
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
				className="w-2/3 tablet:w-64"
				align="end"
			>
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="text-foreground">
							<Text className="text-lg">Presets</Text>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								value={readingMode}
								onValueChange={(value) => {
									setBookPreferences({ readingMode: value as ReadingMode })
								}}
							>
								<DropdownMenuRadioItem value="PAGED" className="text-foreground">
									<Text className="text-lg">Paged</Text>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="CONTINUOUS_HORIZONTAL" className="text-foreground">
									<Text className="text-lg">Horizontal Scroll</Text>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="CONTINUOUS_VERTICAL" className="text-foreground">
									<Text className="text-lg">Vertical Scroll</Text>
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-foreground"
					onPress={() => updateGlobalSettings({ incognito: !incognito })}
				>
					<Text className="text-lg">Incognito</Text>
					<Icon as={Glasses} size={20} className="ml-auto text-foreground-muted" />
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="text-foreground" onPress={handleChangeReadingDirection}>
					<Text className="text-lg">Reading Direction</Text>
					<Icon
						as={readingDirection === ReadingDirection.Ltr ? SquareArrowRight : SquareArrowLeft}
						size={20}
						className="ml-auto text-foreground-muted"
					/>
				</DropdownMenuItem>
				<DropdownMenuSeparator />

				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="text-foreground">
						<Text className="text-lg">Reading Timer</Text>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem
							className="text-foreground"
							onPress={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}
							closeOnPress={false}
						>
							<Text className="text-lg">Enabled</Text>
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
								<Text className="text-lg">Reset Timer</Text>
							</DropdownMenuItem>
						)}
					</DropdownMenuSubContent>
				</DropdownMenuSub>

				{onShowSettings && (
					<>
						<DropdownMenuSeparator variant="group" />

						<DropdownMenuItem className="text-foreground" onPress={onShowSettings}>
							<Text className="text-lg">Preferences</Text>
							<Icon as={Settings2} size={20} className="ml-auto text-foreground-muted" />
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
