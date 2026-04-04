import { ReadingImageScaleFit } from '@stump/graphql'
import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

type Props = {
	behavior: ReadingImageScaleFit
	onChange: (behavior: ReadingImageScaleFit) => void
}

export default function ImageScalingSelect({ behavior, onChange }: Props) {
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
					value={behavior === ReadingImageScaleFit.Auto}
					onValueChange={() => onChange(ReadingImageScaleFit.Auto)}
				>
					<DropdownMenu.ItemTitle>{t(getKey(ReadingImageScaleFit.Auto))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="height"
					value={behavior === ReadingImageScaleFit.Height}
					onValueChange={() => onChange(ReadingImageScaleFit.Height)}
					disabled
				>
					<DropdownMenu.ItemTitle>{t(getKey(ReadingImageScaleFit.Height))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="width"
					value={behavior === ReadingImageScaleFit.Width}
					onValueChange={() => onChange(ReadingImageScaleFit.Width)}
					disabled
				>
					<DropdownMenu.ItemTitle>{t(getKey(ReadingImageScaleFit.Width))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="none"
					value={behavior === ReadingImageScaleFit.None}
					onValueChange={() => onChange(ReadingImageScaleFit.None)}
					disabled
				>
					<DropdownMenu.ItemTitle>{t(getKey(ReadingImageScaleFit.None))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
}

const LOCALE_BASE = 'readerSettings.imageScaling'
const getKey = (key: ReadingImageScaleFit) => `${LOCALE_BASE}.options.${key}`
