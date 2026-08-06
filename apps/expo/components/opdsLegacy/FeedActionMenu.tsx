import { Host, Image } from '@expo/ui/swift-ui'
import { Ellipsis, Grid3x2, List } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'
import { useTranslate } from '~/lib/hooks'

export default function FeedActionMenu() {
	const { t } = useTranslate()
	const [isOpen, setIsOpen] = useState(false)

	const insets = useSafeAreaInsets()
	const colors = useColors()

	const setPreferences = usePreferencesStore((state) => state.patch)
	const layout = usePreferencesStore((state) => state.opdsLayout)

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}
	// TODO: Refactor to make Android align with iOS subtitle design, I am too lazy right now
	const Component = Platform.select({
		ios: (
			<NativeDropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<NativeDropdownMenu.Trigger>
					<Pressable>
						<View
							className="squircle items-center justify-center rounded-full"
							style={{
								height: 35,
								width: 35,
							}}
						>
							<View
								accessibilityLabel={t('common.options')}
								style={{
									height: 35,
									width: 35,
									justifyContent: 'center',
									alignItems: 'center',
								}}
							>
								<Host matchContents>
									<Image systemName="ellipsis" />
								</Host>
							</View>
						</View>
					</Pressable>
				</NativeDropdownMenu.Trigger>

				<NativeDropdownMenu.Content>
					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.CheckboxItem
							value={layout === 'grid'}
							key="displayAsGrid"
							onSelect={() => setPreferences({ opdsLayout: 'grid' })}
						>
							<NativeDropdownMenu.ItemTitle>{t('common.grid')}</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'square.grid.3x2' }} />
							<NativeDropdownMenu.ItemSubtitle>{t('common.grid')}</NativeDropdownMenu.ItemSubtitle>,
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={layout === 'list'}
							key="displayAsList"
							onSelect={() => setPreferences({ opdsLayout: 'list' })}
						>
							<NativeDropdownMenu.ItemTitle>{t('common.list')}</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'list.bullet' }} />
							<NativeDropdownMenu.ItemSubtitle>{t('common.list')}</NativeDropdownMenu.ItemSubtitle>,
						</NativeDropdownMenu.CheckboxItem>
					</NativeDropdownMenu.Group>
				</NativeDropdownMenu.Content>
			</NativeDropdownMenu.Root>
		),
		android: (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="squircle ml-2 mr-2 h-12 w-12 border-edge rounded-full border"
						variant="ghost"
						size="icon"
					>
						{({ pressed }) => (
							<View className="squircle items-center justify-center rounded-full">
								<Icon
									as={Ellipsis}
									size={20}
									style={{
										opacity: isOpen ? 0.5 : pressed ? 0.7 : 1,
										// @ts-expect-error: It's fine
										color: colors.foreground.subtle,
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
					<DropdownMenuCheckboxItem
						checked={layout === 'grid'}
						onCheckedChange={() => setPreferences({ opdsLayout: 'grid' })}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t('common.grid')}</Text>
						<Icon as={Grid3x2} size={20} className="text-foreground-muted ml-auto" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={layout === 'list'}
						onCheckedChange={() => setPreferences({ opdsLayout: 'list' })}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t('common.list')}</Text>
						<Icon as={List} size={20} className="text-foreground-muted ml-auto" />
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	})

	// TODO: Use ActionMenu once expo/ui better supports checkbox items with icons
	return Component
}
