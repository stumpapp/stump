import { ChevronsUpDown } from 'lucide-react-native'
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
					variant="ghost"
					className={cn('gap-2 px-0 h-[unset] flex-row items-center justify-between', className)}
					size="sm"
				>
					<Text
						className={cn(
							'text-lg font-normal text-foreground-muted',
							!selectedOption && 'text-foreground-subtle',
						)}
					>
						{selectedOption?.label ?? placeholder}
					</Text>
					<View>
						<Icon as={ChevronsUpDown} size={16} className="text-foreground-subtle" />
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
