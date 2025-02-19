import { useSDK } from '@stump/client'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ZodError } from 'zod'

import { icons } from '~/lib'

import { Text } from '../ui'

const { Rss, Slash } = icons

type Props = {
	error?: unknown | null
}
export default function MaybeErrorFeed({ error }: Props) {
	const { sdk } = useSDK()

	// If we aren't authed the lifecycles outside this component will handle it
	// If there is no error, we don't need to render anything
	if (!error || !sdk.isAuthed) return null

	const renderError = () => {
		if (error instanceof ZodError) {
			return (
				<View className="flex-1 items-center gap-2">
					<Text>{`This feed is not valid. It contains ${error.issues.length} issue${error.issues.length !== 1 ? 's' : ''}:`}</Text>

					<View className="rounded-xl bg-background-surface p-4">
						<Text>{JSON.stringify(error.issues, null, 2)}</Text>
					</View>
				</View>
			)
		} else if (error instanceof Error && error.message) {
			return <Text>{error.message}</Text>
		} else {
			return <Text>There was an error fetching this feed.</Text>
		}
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1 bg-background p-4">
				<View className="flex-1 items-center justify-center gap-2">
					<View className="relative flex justify-center">
						<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<Rss className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</View>
					</View>

					{renderError()}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
