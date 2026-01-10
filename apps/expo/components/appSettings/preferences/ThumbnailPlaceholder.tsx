import { ChevronsUpDown, Palette } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function ThumbnailPlaceholder() {
	const { thumbnailPlaceholder, patch } = usePreferencesStore((state) => ({
		thumbnailPlaceholder: state.thumbnailPlaceholder,
		patch: state.patch,
	}))

	const [isOpen, setIsOpen] = useState(false)

	return (
		<AppSettingsRow icon={Palette} title="Thumbnail Placeholder">
			<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<Pressable onPress={() => setIsOpen((prev) => !prev)}>
						{({ pressed }) => (
							<View className={cn('flex flex-row items-center gap-2', pressed && 'opacity-70')}>
								<Text className="text-foreground-muted">{getLabel(thumbnailPlaceholder)}</Text>
								<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
							</View>
						)}
					</Pressable>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						value={thumbnailPlaceholder === 'grayscale'}
						key="grayscale"
						onSelect={() => patch({ thumbnailPlaceholder: 'grayscale' })}
					>
						Grayscale
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailPlaceholder === 'averageColor'}
						key="averageColor"
						onSelect={() => patch({ thumbnailPlaceholder: 'averageColor' })}
					>
						Average Color
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailPlaceholder === 'colorful'}
						key="colorful"
						onSelect={() => patch({ thumbnailPlaceholder: 'colorful' })}
					>
						Colorful
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={thumbnailPlaceholder === 'thumbhash'}
						key="thumbhash"
						onSelect={() => patch({ thumbnailPlaceholder: 'thumbhash' })}
					>
						Thumbhash
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</AppSettingsRow>
	)
}

const LABELS = {
	grayscale: 'Grayscale',
	averageColor: 'Average Color',
	colorful: 'Colorful',
	thumbhash: 'Thumbhash',
}

const getLabel = (key: keyof typeof LABELS) => {
	return LABELS[key] || 'Grayscale'
}
