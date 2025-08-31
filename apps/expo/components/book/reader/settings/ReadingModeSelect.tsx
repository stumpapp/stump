import { ReadingMode } from '@stump/graphql'
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
						value={mode === ReadingMode.Paged}
						onValueChange={() => onChange(ReadingMode.Paged)}
					>
						<DropdownMenu.ItemTitle>Paged</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="continuous:horizontal"
						value={mode === ReadingMode.ContinuousHorizontal}
						onValueChange={() => onChange(ReadingMode.ContinuousHorizontal)}
					>
						<DropdownMenu.ItemTitle>Scroll (Horizontal)</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="continuous:vertical"
						value={mode === ReadingMode.ContinuousVertical}
						onValueChange={() => onChange(ReadingMode.ContinuousVertical)}
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
	[ReadingMode.Paged]: 'Paged',
	[ReadingMode.ContinuousHorizontal]: 'Scroll (Horizontal)',
	[ReadingMode.ContinuousVertical]: 'Scroll (Vertical)',
}
