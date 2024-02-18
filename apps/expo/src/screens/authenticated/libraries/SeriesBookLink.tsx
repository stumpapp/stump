import { getMediaThumbnail } from '@stump/api'
import { Media } from '@stump/types'
import { Image } from 'react-native'

import { Link, Text, View } from '@/components'

type Props = {
	book: Media
}

export default function SeriesBookLink({ book }: Props) {
	return (
		<Link to={{ params: { id: book.id }, screen: 'BookStack' }} className="max-w-full">
			<View className="w-full flex-row space-x-2 p-3 text-left">
				<View>
					<Image
						source={{ uri: getMediaThumbnail(book.id) }}
						style={{ height: 50, objectFit: 'scale-down', width: 50 }}
					/>
				</View>

				<View className="w-0 flex-1 flex-grow">
					<Text size="sm" className="shrink-1">
						{book.name}
					</Text>
				</View>
			</View>
		</Link>
	)
}
