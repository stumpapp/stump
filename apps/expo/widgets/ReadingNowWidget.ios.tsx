import { Image, ProgressView, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
	clipShape,
	containerBackground,
	font,
	foregroundStyle,
	frame,
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
					Medium (multiple books)
				</Text>
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
