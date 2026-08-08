import { HStack, Image, Link, ProgressView, Text, VStack, ZStack } from '@expo/ui/swift-ui'
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
	widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'
import { PlatformColor } from 'react-native'

import type { ReadingNowWidgetProps, WidgetBook } from './types'

// TODO: use WidgetEnvironment[widgetContentMargins] to ensure ideal fit of content

const ReadingNowWidget = (
	{ books, accentColor, thumbnailRatio, assetsPath, strings }: ReadingNowWidgetProps,
	{ widgetFamily, colorScheme }: WidgetEnvironment,
) => {
	'widget'

	// Note: i had to put inside the `widget` directive because it would throw error otherwise about
	// ident not found
	const bookUrl = (book: WidgetBook) => {
		if (book.isReadingOffline) return `stump://offline/${book.id}`
		return `stump://server/${book.serverId}/books/${book.id}`
	}

	const owlPath = (name: string) =>
		assetsPath.endsWith('/') ? `${assetsPath}${name}` : `${assetsPath}/${name}`

	const emptyOwl =
		colorScheme === 'dark'
			? owlPath('owl-empty-bookcase-dark.png')
			: owlPath('owl-empty-bookcase-light.png')
	const owlSize = widgetFamily === 'systemLarge' ? 200 : 100

	const firstBook = books[0]

	if (!books.length || !firstBook) {
		if (widgetFamily === 'accessoryRectangular') {
			return (
				<HStack spacing={6} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
					<Image
						systemName="book"
						modifiers={[
							resizable(),
							frame({ width: 16, height: 16 }),
							foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
						]}
					/>

					<Text
						modifiers={[
							font({ size: 12, weight: 'medium' }),
							foregroundStyle({ type: 'hierarchical', style: 'primary' }),
							lineLimit(1),
						]}
					>
						{strings.nothingInProgress}
					</Text>
				</HStack>
			)
		}

		return (
			<ZStack
				modifiers={[
					containerBackground(PlatformColor('systemBackground'), 'widget'),
					clipShape('containerRelativeShape'),
				]}
			>
				<VStack spacing={8} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
					<Image
						uiImage={emptyOwl}
						modifiers={[resizable(), frame({ width: owlSize, height: owlSize })]}
					/>

					<Text
						modifiers={[
							foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
							font({ textStyle: 'callout' }),
						]}
					>
						{strings.nothingInProgress}
					</Text>
				</VStack>
			</ZStack>
		)
	}

	if (widgetFamily === 'accessoryRectangular') {
		return (
			<ZStack
				modifiers={[
					containerBackground(PlatformColor('systemBackground'), 'widget'),
					clipShape('containerRelativeShape'),
					widgetURL(bookUrl(firstBook)),
				]}
			>
				<VStack
					alignment="leading"
					spacing={2}
					modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}
				>
					<HStack spacing={6} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
						<Image
							systemName="book"
							modifiers={[
								resizable(),
								frame({ width: 16, height: 16 }),
								foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
							]}
						/>
						<Text
							modifiers={[
								font({ size: 12, weight: 'medium' }),
								foregroundStyle({ type: 'hierarchical', style: 'primary' }),
								lineLimit(1),
							]}
						>
							{firstBook.name}
						</Text>
					</HStack>
					<ProgressView value={firstBook.percentage} />
				</VStack>
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
					widgetURL(bookUrl(firstBook)),
					padding({ all: 8 }),
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
					padding({ all: 8 }),
				]}
			>
				<VStack
					spacing={8}
					modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), padding({ all: 12 })]}
				>
					{visibleBooks.map((book) => (
						<Link
							key={book.id}
							destination={bookUrl(book)}
							modifiers={[frame({ maxWidth: Infinity })]}
						>
							<HStack spacing={12} alignment="center" modifiers={[frame({ maxWidth: Infinity })]}>
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
									<ProgressView value={book.percentage} modifiers={[tint(accentColor)]} />
								</VStack>
							</HStack>
						</Link>
					))}
				</VStack>
			</ZStack>
		)
	}

	const visibleBooks = books.slice(0, 6)
	const thumbnailWidth = books.length >= 5 ? 40 : 50
	const thumbnailHeight = thumbnailWidth / thumbnailRatio

	return (
		<ZStack
			modifiers={[
				containerBackground(PlatformColor('systemBackground'), 'widget'),
				clipShape('containerRelativeShape'),
				padding({ all: 8 }),
			]}
		>
			<VStack
				spacing={8}
				modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), padding({ all: 12 })]}
			>
				{visibleBooks.map((book) => (
					<Link
						key={book.id}
						destination={bookUrl(book)}
						modifiers={[frame({ maxWidth: Infinity })]}
					>
						<HStack spacing={12} alignment="center" modifiers={[frame({ maxWidth: Infinity })]}>
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

							<VStack alignment="leading" spacing={12}>
								<VStack alignment="leading" spacing={4}>
									<Text
										modifiers={[
											font({ size: 12, weight: 'medium' }),
											foregroundStyle({ type: 'hierarchical', style: 'primary' }),
											lineLimit(1),
										]}
									>
										{book.name}
									</Text>
									<Text
										modifiers={[
											font({ size: 11 }),
											foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
										]}
									>
										{book.timeAgoLabel}
									</Text>
								</VStack>
								<ProgressView value={book.percentage} modifiers={[tint(accentColor)]} />
							</VStack>
						</HStack>
					</Link>
				))}
			</VStack>
		</ZStack>
	)
}

export default createWidget('ReadingNow', ReadingNowWidget)
