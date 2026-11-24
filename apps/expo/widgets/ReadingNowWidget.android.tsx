import {
	Box,
	Column,
	Image,
	LazyColumn,
	LinearProgressIndicator,
	Row,
	Spacer,
	Text,
} from '@expo/ui/jetpack-compose'
import {
	background,
	cornerRadius,
	fillMaxSize,
	fillMaxWidth,
	height,
	padding,
	paddingAll,
	size,
	width,
} from '@expo/ui/jetpack-compose/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

import type { ReadingNowWidgetProps } from './types'

// re: widgetSize
// https://github.com/expo/expo/commit/8693c751ce5c5be59c1bab7857c18bca6f966b52
// ^ not in latest release yet :sob:, so sizing and what not is not quite
// ideal but sufficient for now I GUESS

const ReadingNow = (
	{ books, accentColor, thumbnailRatio, assetsPath, strings }: ReadingNowWidgetProps,
	{ colorScheme }: WidgetEnvironment,
) => {
	'widget'

	const isDark = colorScheme === 'dark'
	const colors = {
		background: isDark ? '#1C1B1F' : '#FFFFFF',
		primary: isDark ? '#E6E1E5' : '#1C1B1F',
		secondary: isDark ? '#A8A3AA' : '#605D62',
		track: isDark ? '#3A383D' : '#E4E1E6',
	}

	const owlPath = (name: string) =>
		assetsPath.endsWith('/') ? `${assetsPath}${name}` : `${assetsPath}/${name}`
	const emptyOwl = isDark
		? owlPath('owl-empty-bookcase-dark.png')
		: owlPath('owl-empty-bookcase-light.png')

	if (!books.length) {
		return (
			<Box modifiers={[fillMaxSize(), background(colors.background)]} contentAlignment="center">
				<Column horizontalAlignment="center">
					<Image source={{ uri: emptyOwl }} contentDescription={null} modifiers={[size(80, 80)]} />
					<Spacer modifiers={[height(4)]} />
					<Text color={colors.secondary} style={{ fontSize: 13 }}>
						{strings.nothingInProgress}
					</Text>
				</Column>
			</Box>
		)
	}

	const thumbnailHeight = 56
	const thumbnailWidth = thumbnailHeight * thumbnailRatio

	// FIXME: android stopped updating the widget, no idea what is wrong. a bit finicky!!!!
	return (
		<Box modifiers={[fillMaxSize(), background(colors.background), paddingAll(12)]}>
			<LazyColumn modifiers={[fillMaxSize()]}>
				{books.slice(0, 5).map((book) => {
					return (
						<Row
							key={book.id}
							verticalAlignment="center"
							modifiers={[fillMaxWidth(), padding(0, 0, 0, 10)]}
						>
							{book.thumbnailPath ? (
								<Image
									source={{ uri: book.thumbnailPath }}
									contentScale="fillBounds"
									modifiers={[size(thumbnailWidth, thumbnailHeight), cornerRadius(8)]}
								/>
							) : (
								<Box
									modifiers={[
										size(thumbnailWidth, thumbnailHeight),
										background(colors.track),
										cornerRadius(8),
									]}
								/>
							)}
							{/*^ FIXME: i cannot figure out if the Box works?? i tried isolated (below) and it just doesn't show up? */}
							{/*<Box
								modifiers={[
									size(thumbnailWidth, thumbnailHeight),
									background(colors.track),
									cornerRadius(8),
								]}
							/>*/}

							<Spacer modifiers={[width(12)]} />
							{/* ^ spacedBy on Row doesn't seem to work?? kinda really very annoying */}

							<Column modifiers={[fillMaxWidth()]}>
								<Text
									color={colors.primary}
									maxLines={1}
									overflow="ellipsis"
									style={{ fontSize: 13, fontWeight: '600' }}
								>
									{book.name}
								</Text>
								<Spacer modifiers={[height(2)]} />
								<Text color={colors.secondary} maxLines={1} style={{ fontSize: 11 }}>
									{book.timeAgoLabel}
								</Text>
								<Spacer modifiers={[height(6)]} />
								<LinearProgressIndicator
									progress={book.percentage}
									color={accentColor}
									trackColor={colors.track}
									modifiers={[fillMaxWidth(), height(4)]}
								/>
							</Column>
						</Row>
					)
				})}
			</LazyColumn>
		</Box>
	)
}

export default createWidget('ReadingNow', ReadingNow)
