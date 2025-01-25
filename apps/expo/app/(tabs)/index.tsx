import { Link } from 'expo-router'
import partition from 'lodash/partition'
import { View } from 'react-native'

import { Text } from '~/components/ui/text'
import { useSavedServers } from '~/stores'

const mockServers = [
	{
		id: 'dev',
		name: 'Localhost',
		url: 'http://192.168.0.188:10801',
		kind: 'stump',
	},
]

export default function Screen() {
	const { savedServers } = useSavedServers()

	const [stumpServers] = partition(savedServers, (server) => server.kind === 'stump')

	return (
		<View className="flex-1 items-start justify-start gap-5 bg-background p-4">
			<View className="flex w-full items-start gap-2">
				<Text className="text-foreground-muted">Stump</Text>

				{[...mockServers, ...stumpServers].map((server) => (
					<Link
						key={server.id}
						href={`/server/${server.id}`}
						className="bg-background-muted w-full items-center rounded-lg border border-edge bg-background-surface p-2"
					>
						<View className="flex-1 items-start justify-center gap-1">
							<Text className="text-lg">{server.name}</Text>
							<Text className="text-foreground-muted">{server.url}</Text>
						</View>
					</Link>
				))}
			</View>

			<View className="flex w-full items-start gap-2">
				<Text className="text-foreground-muted">OPDS</Text>

				<View className="h-24 w-full items-center justify-center rounded-lg border border-dashed border-edge px-3">
					<Text>No OPDS servers added</Text>
				</View>
			</View>
		</View>
	)
}
