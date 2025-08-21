import upperFirst from 'lodash/upperFirst'
import { ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'

import AppSettingsRow from '../AppSettingsRow'

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
								<ChevronRight size={20} className="text-foreground-muted" />
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
