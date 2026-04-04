import { ReadingMode } from '@stump/graphql'
import { ChevronsUpDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

type Props = {
	mode: ReadingMode
	onChange: (mode: ReadingMode) => void
}

export default function ReadingModeSelect({ mode, onChange }: Props) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<DropdownMenu.Root onOpenChange={setIsOpen}>
			<DropdownMenu.Trigger>
				<View className={cn('gap-1.5 flex-row items-center', { 'opacity-80': isOpen })}>
					<Text>{t(getOption(mode))}</Text>
					<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
				</View>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.CheckboxItem
					key="paged"
					value={mode === ReadingMode.Paged}
					onValueChange={() => onChange(ReadingMode.Paged)}
				>
					<DropdownMenu.ItemTitle>{t(getOption(ReadingMode.Paged))}</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="continuous:horizontal"
					value={mode === ReadingMode.ContinuousHorizontal}
					onValueChange={() => onChange(ReadingMode.ContinuousHorizontal)}
				>
					<DropdownMenu.ItemTitle>
						{t(getOption(ReadingMode.ContinuousHorizontal))}
					</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>

				<DropdownMenu.CheckboxItem
					key="continuous:vertical"
					value={mode === ReadingMode.ContinuousVertical}
					onValueChange={() => onChange(ReadingMode.ContinuousVertical)}
				>
					<DropdownMenu.ItemTitle>
						{t(getOption(ReadingMode.ContinuousVertical))}
					</DropdownMenu.ItemTitle>
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
}

const LOCALE_BASE = 'readerSettings.readingMode'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getOption = (mode: ReadingMode) => getKey(`options.${mode}`)
