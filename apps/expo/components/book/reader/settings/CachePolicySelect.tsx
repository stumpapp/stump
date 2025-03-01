import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { CachePolicy } from '~/stores/reader'

const { ChevronsUpDown } = icons

type Props = {
	policy: CachePolicy
	onChange: (policy: CachePolicy) => void
}

// TODO: consider splitting between primary and secondary images (e.g., primary images are cached in memory and disk, secondary images are cached on disk)

export default function CachePolicySelect({ policy, onChange }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Cache Policy</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{LABELS[policy]}</Text>
						<ChevronsUpDown className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="paged"
						value={policy === 'memory-disk'}
						onValueChange={() => onChange('memory-disk')}
					>
						<DropdownMenu.ItemTitle>{LABELS['memory-disk']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="disk"
						value={policy === 'disk'}
						onValueChange={() => onChange('disk')}
					>
						<DropdownMenu.ItemTitle>{LABELS['disk']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="memory"
						value={policy === 'memory'}
						onValueChange={() => onChange('memory')}
					>
						<DropdownMenu.ItemTitle>{LABELS['memory']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="none"
						value={policy === 'none'}
						onValueChange={() => onChange('none')}
						destructive
					>
						<DropdownMenu.ItemTitle>{LABELS['none']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</View>
	)
}

const LABELS: Record<CachePolicy, string> = {
	none: 'None',
	disk: 'Disk',
	memory: 'Memory',
	'memory-disk': 'Memory & Disk',
}
