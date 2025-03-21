import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'
import { CachePolicy } from '~/stores/reader'

import AppSettingsRow from '../AppSettingsRow'

const { ChevronsUpDown } = icons

export default function CachePolicySelect() {
	const [isOpen, setIsOpen] = useState(false)

	const { cachePolicy = 'memory-disk', patch } = usePreferencesStore((state) => ({
		cachePolicy: state.cachePolicy,
		patch: state.patch,
	}))

	const onChange = (policy: CachePolicy) =>
		patch({
			cachePolicy: policy,
		})

	return (
		<AppSettingsRow icon="Image" title="Cache Policy">
			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text className="text-foreground-muted">{LABELS[cachePolicy]}</Text>
						<ChevronsUpDown className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="paged"
						value={cachePolicy === 'memory-disk'}
						onValueChange={() => onChange('memory-disk')}
					>
						<DropdownMenu.ItemTitle>{LABELS['memory-disk']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="disk"
						value={cachePolicy === 'disk'}
						onValueChange={() => onChange('disk')}
					>
						<DropdownMenu.ItemTitle>{LABELS['disk']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="memory"
						value={cachePolicy === 'memory'}
						onValueChange={() => onChange('memory')}
					>
						<DropdownMenu.ItemTitle>{LABELS['memory']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="none"
						value={cachePolicy === 'none'}
						onValueChange={() => onChange('none')}
						destructive
					>
						<DropdownMenu.ItemTitle>{LABELS['none']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</AppSettingsRow>
	)

	return (
		<View className="flex flex-row items-center justify-between p-4">
			<Text>Cache Policy</Text>

			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text>{LABELS[cachePolicy]}</Text>
						<ChevronsUpDown className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="paged"
						value={cachePolicy === 'memory-disk'}
						onValueChange={() => onChange('memory-disk')}
					>
						<DropdownMenu.ItemTitle>{LABELS['memory-disk']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="disk"
						value={cachePolicy === 'disk'}
						onValueChange={() => onChange('disk')}
					>
						<DropdownMenu.ItemTitle>{LABELS['disk']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="memory"
						value={cachePolicy === 'memory'}
						onValueChange={() => onChange('memory')}
					>
						<DropdownMenu.ItemTitle>{LABELS['memory']}</DropdownMenu.ItemTitle>
					</DropdownMenu.CheckboxItem>

					<DropdownMenu.CheckboxItem
						key="none"
						value={cachePolicy === 'none'}
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
