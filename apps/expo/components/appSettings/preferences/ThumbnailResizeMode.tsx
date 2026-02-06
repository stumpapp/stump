import { ChevronsUpDown, Maximize } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function ThumbnailResizeMode() {
	const { thumbnailResizeMode, patch } = usePreferencesStore((state) => ({
		thumbnailResizeMode: state.thumbnailResizeMode,
		patch: state.patch,
	}))

	const [isOpen, setIsOpen] = useState(false)

	return (
		<AppSettingsRow icon={Maximize} title="Thumbnail Resize">
			<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<Pressable onPress={() => setIsOpen((prev) => !prev)}>
						{({ pressed }) => (
							<View className={cn('flex flex-row items-center gap-2', pressed && 'opacity-70')}>
								<Text className="text-foreground-muted">{getLabel(thumbnailResizeMode)}</Text>
								<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
							</View>
						)}
					</Pressable>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						value={thumbnailResizeMode === 'cover'}
						key="cover"
						onSelect={() => patch({ thumbnailResizeMode: 'cover' })}
					>
						Cover (Default)
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailResizeMode === 'stretch'}
						key="stretch"
						onSelect={() => patch({ thumbnailResizeMode: 'stretch' })}
					>
						Stretch
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailResizeMode === 'fit'}
						key="fit"
						onSelect={() => patch({ thumbnailResizeMode: 'fit' })}
					>
						Fit
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</AppSettingsRow>
	)
}

const LABELS = {
	cover: 'Cover',
	stretch: 'Stretch',
	fit: 'Fit',
}

const getLabel = (key: keyof typeof LABELS) => {
	return LABELS[key] || 'Cover'
}
