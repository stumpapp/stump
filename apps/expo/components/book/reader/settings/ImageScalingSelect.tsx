import { ReadingImageScaleFit } from '@stump/graphql'
import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	behavior: ReadingImageScaleFit
	onChange: (behavior: ReadingImageScaleFit) => void
}

// TODO: What to do with Auto here?

export default function ImageScalingSelect({ behavior, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Scaling</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{BEHAVIOR_TEXT[behavior]}</Text>
						<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="width"
						value={behavior === ReadingImageScaleFit.Width}
						onValueChange={() => onChange(ReadingImageScaleFit.Width)}
						disabled
					>
						<DropdownMenu.ItemTitle>Fit Width</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="height"
						value={behavior === ReadingImageScaleFit.Height}
						onValueChange={() => onChange(ReadingImageScaleFit.Height)}
						disabled
					>
						<DropdownMenu.ItemTitle>Fit Height</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="none"
						value={behavior === ReadingImageScaleFit.None}
						onValueChange={() => onChange(ReadingImageScaleFit.None)}
						disabled
					>
						<DropdownMenu.ItemTitle>None</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}

const BEHAVIOR_TEXT: Record<ReadingImageScaleFit, string> = {
	[ReadingImageScaleFit.Height]: 'Fit Height',
	[ReadingImageScaleFit.Width]: 'Fit Width',
	[ReadingImageScaleFit.None]: 'None',
	[ReadingImageScaleFit.Auto]: 'Auto',
}
