import { Column, Image, Text } from '@expo/ui/jetpack-compose'
import { createWidget, WidgetEnvironment } from 'expo-widgets'

import { ReadingNowWidgetProps, WidgetBook } from './types'

const ReadingNow = (
	{ books, accentColor, thumbnailRatio, assetsPath, strings }: ReadingNowWidgetProps,
	{ widgetFamily, colorScheme }: WidgetEnvironment,
) => {
	'widget'

	// Note: i had to put inside the `widget` directive because it would throw error otherwise about
	// ident not found
	const bookUrl = (book: WidgetBook) => {
		if (book.isReadingOffline) return `stump://offline/${book.id}`
		return `stump://stump/${book.serverId}/books/${book.id}`
	}

	const owlPath = (name: string) =>
		assetsPath.endsWith('/') ? `${assetsPath}${name}` : `${assetsPath}/${name}`

	const emptyOwl =
		colorScheme === 'dark'
			? owlPath('owl-empty-bookcase-dark.png')
			: owlPath('owl-empty-bookcase-light.png')
	const owlSize = widgetFamily === 'systemLarge' ? 200 : 100

	const firstBook = books[0]

	if (!books.length || !firstBook)
		return (
			<Column>
				<Text>TODO</Text>
			</Column>
		)

	return (
		<Column>
			{firstBook.thumbnailPath && <Image source={{ uri: firstBook?.thumbnailPath }} />}
			<Text></Text>
		</Column>
	)
}

export default createWidget('ReadingNow', ReadingNow)
