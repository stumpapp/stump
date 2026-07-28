import { HStack, Image, ProgressView, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
	clipShape,
	containerBackground,
	font,
	foregroundStyle,
	frame,
	lineLimit,
	padding,
	resizable,
	tint,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'
import { PlatformColor } from 'react-native'

import type { ReadingNowWidgetProps } from './types'

// TODO:
// - localization, etc
// - use owl for empty state!!
// - link? what happens when clicked? can i deep link:
//    - small widget = direct to book (entire widget is link)
//    - other widgets more complex, can i do multiple links? prolly not

const ReadingNowWidget = (
	{ books, accentColor, thumbnailRatio }: ReadingNowWidgetProps,
	{ widgetFamily }: WidgetEnvironment,
) => {
	'widget'

	const firstBook = books[0]

	if (!books.length || !firstBook) {
		return (
			<ZStack
				modifiers={[
					containerBackground(PlatformColor('systemBackground'), 'widget'),
					clipShape('containerRelativeShape'),
				]}
			>
				<Text
					modifiers={[
						foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
						font({ textStyle: 'callout' }),
					]}
				>
					Nothing in progress
				</Text>
			</ZStack>
		)
	}

	if (widgetFamily === 'systemSmall') {
		const thumbnailWidth = 75
		const thumbnailHeight = thumbnailWidth / thumbnailRatio
		return (
			<ZStack
				modifiers={[
					containerBackground(PlatformColor('systemBackground'), 'widget'),
					clipShape('containerRelativeShape'),
				]}
			>
				<VStack spacing={0} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
					{firstBook.thumbnailPath && (
						<Image
							uiImage={firstBook.thumbnailPath}
							modifiers={[
								resizable(),
								frame({ width: thumbnailWidth, height: thumbnailHeight }),
								clipShape('roundedRectangle', 6),
							]}
						/>
					)}

					<VStack alignment="leading" spacing={4} modifiers={[padding({ all: 8 })]}>
						<Text
							modifiers={[
								font({ size: 13, weight: 'semibold' }),
								foregroundStyle({ type: 'hierarchical', style: 'primary' }),
								lineLimit(1),
							]}
						>
							{firstBook.name}
						</Text>
						<ProgressView value={firstBook.percentage} modifiers={[tint(accentColor)]} />
					</VStack>
				</VStack>
			</ZStack>
		)
	}

	if (widgetFamily === 'systemMedium' && books.length === 1) {
		return (
			<ZStack
				modifiers={[
					containerBackground(PlatformColor('systemBackground'), 'widget'),
					clipShape('containerRelativeShape'),
				]}
			>
				<Text
					modifiers={[
						foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
						font({ textStyle: 'callout' }),
					]}
				>
					Medium (single book large format)
				</Text>
			</ZStack>
		)
	}

	if (widgetFamily === 'systemMedium') {
		const visibleBooks = books.slice(0, 3)
		const thumbnailWidth = 30
		const thumbnailHeight = thumbnailWidth / thumbnailRatio

		return (
			<ZStack
				modifiers={[
					containerBackground(PlatformColor('systemBackground'), 'widget'),
					clipShape('containerRelativeShape'),
				]}
			>
				<VStack
					spacing={8}
					modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), padding({ all: 12 })]}
				>
					{visibleBooks.map((book) => (
						<HStack
							key={book.id}
							spacing={12}
							alignment="center"
							modifiers={[frame({ maxWidth: Infinity })]}
						>
							{book.thumbnailPath && (
								<Image
									uiImage={book.thumbnailPath}
									modifiers={[
										resizable(),
										frame({ width: thumbnailWidth, height: thumbnailHeight }),
										clipShape('roundedRectangle', 6),
									]}
								/>
							)}

							<VStack alignment="leading" spacing={8}>
								<Text
									modifiers={[
										font({ size: 12, weight: 'medium' }),
										foregroundStyle({ type: 'hierarchical', style: 'primary' }),
										lineLimit(1),
									]}
								>
									{book.name}
								</Text>
								<ProgressView
									value={book.percentage}
									modifiers={[tint(PlatformColor('systemBlue'))]}
								/>
							</VStack>
						</HStack>
					))}
				</VStack>
			</ZStack>
		)
	}

	return (
		<ZStack
			modifiers={[
				containerBackground(PlatformColor('systemBackground'), 'widget'),
				clipShape('containerRelativeShape'),
			]}
		>
			<Text
				modifiers={[
					foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
					font({ textStyle: 'callout' }),
				]}
			>
				systemLarge assumed
			</Text>
		</ZStack>
	)
}

export default createWidget('ReadingNow', ReadingNowWidget)
