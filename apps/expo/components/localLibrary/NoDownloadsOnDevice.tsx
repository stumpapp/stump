import { View } from 'react-native'

import Owl, { useOwlHeaderOffset } from '../Owl'
import { Heading, Text } from '../ui'
import { DownloadSourceFilter } from './store'

type Props = {
	source: DownloadSourceFilter
}

export default function NoDownloadsOnDevice({ source }: Props) {
	const emptyContainerStyle = useOwlHeaderOffset()
	return (
		<View
			className="h-full flex-1 items-center justify-center gap-6 p-4"
			style={emptyContainerStyle}
		>
			<Owl owl="empty" />

			<View className="gap-2 px-4 tablet:max-w-lg">
				<Heading size="lg" className="text-center font-semibold leading-tight">
					{TITLES[source]}
				</Heading>
				<Text className="text-center text-lg">{DESCRIPTIONS[source]}</Text>
			</View>
		</View>
	)
}

const TITLES: Record<DownloadSourceFilter, string> = {
	all: 'Nothing to read yet',
	imported: 'No imported books',
	server: 'No downloaded books',
}

const DESCRIPTIONS: Record<DownloadSourceFilter, string> = {
	all: 'Once you have books for offline reading, they will appear here',
	imported: 'Import books to read them offline',
	server: 'Download books from your server to read them offline',
}
