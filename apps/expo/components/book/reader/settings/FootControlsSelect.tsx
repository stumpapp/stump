import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { FooterControls } from '~/stores/reader'

type Props = {
	variant: FooterControls
	onChange: (variant: FooterControls) => void
}

export default function FooterControlsSelect({ variant, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Bottom Controls</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{VARIANT_TEXT[variant]}</Text>
						<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="images"
						value={variant === 'images'}
						onValueChange={() => onChange('images')}
					>
						<DropdownMenu.ItemTitle>{VARIANT_TEXT.images}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="slider"
						value={variant === 'slider'}
						onValueChange={() => onChange('slider')}
					>
						<DropdownMenu.ItemTitle>{VARIANT_TEXT.slider}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}

const VARIANT_TEXT: Record<FooterControls, string> = {
	images: 'Image Gallery',
	slider: 'Slider',
}
