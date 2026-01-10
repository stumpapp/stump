import { ReadingDirection } from '@stump/graphql'
import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	direction: ReadingDirection
	onChange: (direction: ReadingDirection) => void
}

export default function ReadingDirectionSelect({ direction, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Direction</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{direction.toUpperCase()}</Text>
						<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="ltr"
						value={direction === ReadingDirection.Ltr}
						onValueChange={() => onChange(ReadingDirection.Ltr)}
					>
						<DropdownMenu.ItemTitle>Left to Right</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="rtl"
						value={direction === ReadingDirection.Rtl}
						onValueChange={() => onChange(ReadingDirection.Rtl)}
					>
						<DropdownMenu.ItemTitle>Right to Left</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}
