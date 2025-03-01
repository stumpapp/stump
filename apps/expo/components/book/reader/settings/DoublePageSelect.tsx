import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { DoublePageBehavior } from '~/stores/reader'

const { ChevronsUpDown } = icons

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

// TODO: Remove hardcoded disabled values and double page modes

export default function DoublePageSelect({ behavior, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Double Paged</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{BEHAVIOR_TEXT[behavior]}</Text>
						<ChevronsUpDown className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="auto"
						value={behavior === 'auto'}
						onValueChange={() => onChange('auto')}
						disabled
					>
						<DropdownMenu.ItemTitle>Auto</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="always"
						value={behavior === 'always'}
						onValueChange={() => onChange('always')}
						disabled
					>
						<DropdownMenu.ItemTitle>Always</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="off"
						value={behavior === 'off'}
						onValueChange={() => onChange('off')}
						disabled
					>
						<DropdownMenu.ItemTitle>Off</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}

const BEHAVIOR_TEXT: Record<DoublePageBehavior, string> = {
	always: 'Always',
	auto: 'Auto',
	off: 'Off',
}
