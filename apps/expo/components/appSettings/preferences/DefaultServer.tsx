import { ChevronsUpDown, Server } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function DefaultServer() {
	const [isOpen, setIsOpen] = useState(false)

	const { savedServers, setDefaultServer } = useSavedServers()

	const defaultServer = savedServers.find((server) => server.defaultServer)

	return (
		<AppSettingsRow icon={Server} title="Default server">
			<DropdownMenu.Root onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<View className={cn('flex-row items-center gap-1.5', { 'opacity-80': isOpen })}>
						<Text className="text-foreground-muted">
							{defaultServer ? defaultServer.name : 'None'}
						</Text>
						<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
					</View>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						key="none"
						value={defaultServer == null}
						onValueChange={() => {
							setDefaultServer(undefined)
						}}
						destructive
					>
						<DropdownMenu.ItemTitle>None</DropdownMenu.ItemTitle>
						<DropdownMenu.ItemIndicator />
					</DropdownMenu.CheckboxItem>

					{savedServers.map((server) => (
						<DropdownMenu.CheckboxItem
							key={server.id}
							value={server.id === defaultServer?.id}
							onValueChange={() => setDefaultServer(server.id)}
						>
							<DropdownMenu.ItemTitle>{server.name}</DropdownMenu.ItemTitle>
							<DropdownMenu.ItemIndicator />
						</DropdownMenu.CheckboxItem>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</AppSettingsRow>
	)
}
