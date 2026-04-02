import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { FooterControls } from '~/stores/reader'

type Props = {
	variant: FooterControls
	onChange: (variant: FooterControls) => void
}

export default function FooterControlsSelect({ variant, onChange }: Props) {
	const { t } = useTranslate()
	const [isOpen, setIsOpen] = useState(false)

	return (
		<DropdownMenu.Root onOpenChange={setIsOpen}>
			<DropdownMenu.Trigger>
				<View className={cn('gap-1.5 flex-row items-center', { 'opacity-80': isOpen })}>
					<Text>{t(getKey(variant))}</Text>
					<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
				</View>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.CheckboxItem
					key="images"
					value={variant === 'images'}
					onValueChange={() => onChange('images')}
				>
					<DropdownMenu.ItemTitle>{t(getKey('images'))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="slider"
					value={variant === 'slider'}
					onValueChange={() => onChange('slider')}
				>
					<DropdownMenu.ItemTitle>{t(getKey('slider'))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
}

const LOCALE_BASE = 'readerSettings.footerControls'
const getKey = (variant: FooterControls) => `${LOCALE_BASE}.options.${variant}`
