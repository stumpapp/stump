import { ChevronsUpDown, Ruler } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function ThumbnailRatio() {
	const { thumbnailRatio, patch } = usePreferencesStore((state) => ({
		thumbnailRatio: state.thumbnailRatio,
		patch: state.patch,
	}))

	const [isOpen, setIsOpen] = useState(false)

	const ratioToStringMap: Record<number, string> = {
		[5 / 8]: '1 : 1.6',
		[2 / 3]: '1 : 1.5',
		[1 / 1.42]: '1 : √2',
	}
	const thumbnailRatioName = ratioToStringMap[thumbnailRatio]

	return (
		<AppSettingsRow icon={Ruler} title="Thumbnail Ratio">
			<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<Pressable onPress={() => setIsOpen((prev) => !prev)}>
						{({ pressed }) => (
							<View className={cn('flex flex-row items-center gap-2', pressed && 'opacity-70')}>
								<Text className="text-foreground-muted">{thumbnailRatioName}</Text>
								<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
							</View>
						)}
					</Pressable>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						value={thumbnailRatio === 5 / 8}
						key="1 : 1.6"
						onSelect={() => patch({ thumbnailRatio: 5 / 8 })}
					>
						1 : 1.6
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailRatio === 2 / 3}
						key="1 : 1.5"
						onSelect={() => patch({ thumbnailRatio: 2 / 3 })}
					>
						1 : 1.5 (Default)
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailRatio === 1 / 1.42}
						key="1 : √2"
						onSelect={() => patch({ thumbnailRatio: 1 / 1.42 })}
					>
						1 : √2
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</AppSettingsRow>
	)
}
