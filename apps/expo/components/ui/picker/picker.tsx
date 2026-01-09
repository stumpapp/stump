import { ChevronDown } from 'lucide-react-native'
import { View } from 'react-native'

import { usePortalHost } from '~/lib/PortalHostContext'
import { cn } from '~/lib/utils'

import { Button } from '../button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '../dropdown-menu'
import { Icon } from '../icon'
import { Text } from '../text'
import type { PickerProps } from './types'

export function Picker<T extends string = string>({
	value,
	options,
	onValueChange,
	disabled = false,
	placeholder = 'Select...',
	className,
}: PickerProps<T>) {
	const portalHost = usePortalHost()
	const selectedOption = options.find((option) => option.value === value)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<Button
					variant="outline"
					className={cn('flex-row items-center justify-between gap-2', className)}
				>
					<Text className={cn(!selectedOption && 'text-foreground-subtle')}>
						{selectedOption?.label ?? placeholder}
					</Text>
					<View>
						<Icon as={ChevronDown} size={16} className="text-foreground-subtle" />
					</View>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="min-w-[150px]" portalHost={portalHost}>
				<DropdownMenuRadioGroup value={value} onValueChange={(v) => onValueChange(v as T)}>
					{options.map((option) => (
						<DropdownMenuRadioItem key={option.value} value={option.value}>
							<Text>{option.label}</Text>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
