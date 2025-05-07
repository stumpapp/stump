import { ReadingMode } from '@stump/sdk'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

const { ChevronsUpDown } = icons

type Props = {
	mode: ReadingMode
	onChange: (mode: ReadingMode) => void
}

// TODO: Remove hardcoded disabled values and support vertical continuous scrolling

export default function ReadingModeSelect({ mode, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Flow</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{READ_FLOW[mode]}</Text>
						<ChevronsUpDown className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="paged"
						value={mode === 'paged'}
						onValueChange={() => onChange('paged')}
					>
						<DropdownMenu.ItemTitle>Paged</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="continuous:horizontal"
						value={mode === 'continuous:horizontal'}
						onValueChange={() => onChange('continuous:horizontal')}
					>
						<DropdownMenu.ItemTitle>Scroll (Horizontal)</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="continuous:vertical"
						value={mode === 'continuous:vertical'}
						onValueChange={() => onChange('continuous:vertical')}
						disabled
					>
						<DropdownMenu.ItemTitle>Scroll (Vertical)</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}

const READ_FLOW: Record<ReadingMode, string> = {
	paged: 'Paged',
	'continuous:horizontal': 'Scroll (Horizontal)',
	'continuous:vertical': 'Scroll (Vertical)',
}
