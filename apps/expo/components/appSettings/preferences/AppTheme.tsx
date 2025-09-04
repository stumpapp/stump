import upperFirst from 'lodash/upperFirst'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'

const { ChevronsUpDown } = icons

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function AppTheme() {
	const { colorScheme, setColorScheme } = useColorScheme()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<AppSettingsRow icon="Paintbrush" title="Theme">
			<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<Pressable onPress={() => setIsOpen((prev) => !prev)}>
						{({ pressed }) => (
							<View className={cn('flex flex-row items-center gap-2', pressed && 'opacity-70')}>
								<Text className="text-foreground-muted">{upperFirst(colorScheme)}</Text>
								<ChevronsUpDown className="h-5 text-foreground-muted" />
							</View>
						)}
					</Pressable>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						value={colorScheme === 'dark'}
						key="dark"
						onSelect={() => setColorScheme('dark')}
					>
						Dark
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						value={colorScheme === 'light'}
						key="light"
						onSelect={() => setColorScheme('light')}
					>
						Light
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</AppSettingsRow>
	)
}
