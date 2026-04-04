import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { DoublePageBehavior } from '~/stores/reader'

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

export default function DoublePageSelect({ behavior, onChange }: Props) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<DropdownMenu.Root onOpenChange={setIsOpen}>
			<DropdownMenu.Trigger>
				<View className={cn('gap-1.5 flex-row items-center', { 'opacity-80': isOpen })}>
					<Text>{t(getKey(behavior))}</Text>
					<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
				</View>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.CheckboxItem
					key="auto"
					value={behavior === 'auto'}
					onValueChange={() => onChange('auto')}
				>
					<DropdownMenu.ItemTitle>{t(getKey('auto'))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="always"
					value={behavior === 'always'}
					onValueChange={() => onChange('always')}
				>
					<DropdownMenu.ItemTitle>{t(getKey('always'))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="off"
					value={behavior === 'off'}
					onValueChange={() => onChange('off')}
				>
					<DropdownMenu.ItemTitle>{t(getKey('off'))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
}

const LOCALE_BASE = 'readerSettings.doublePageBehavior'
const getKey = (key: DoublePageBehavior) => `${LOCALE_BASE}.options.${key}`
