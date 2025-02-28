import { BookImageScalingFit } from '@stump/client'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

const { ChevronsUpDown } = icons

type Props = {
	behavior: BookImageScalingFit
	onChange: (behavior: BookImageScalingFit) => void
}

// TODO: Remove hardcoded disabled values and support scaling

export default function ImageScalingSelect({ behavior, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Scaling</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{BEHAVIOR_TEXT[behavior]}</Text>
						<ChevronsUpDown className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="width"
						value={behavior === 'width'}
						onValueChange={() => onChange('width')}
						disabled
					>
						<DropdownMenu.ItemTitle>Fit Width</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="height"
						value={behavior === 'height'}
						onValueChange={() => onChange('height')}
						disabled
					>
						<DropdownMenu.ItemTitle>Fit Height</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="none"
						value={behavior === 'none'}
						onValueChange={() => onChange('none')}
						disabled
					>
						<DropdownMenu.ItemTitle>None</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}

const BEHAVIOR_TEXT: Record<BookImageScalingFit, string> = {
	height: 'Fit Height',
	width: 'Fit Width',
	none: 'None',
}
