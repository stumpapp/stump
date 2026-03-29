import { useMemo } from 'react'
import { Linking } from 'react-native'
import { EnrichedMarkdownText, type MarkdownStyle } from 'react-native-enriched-markdown'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

type Props = {
	children: string
	markdownStyle?: MarkdownStyle
	selectable?: boolean
}

export default function Markdown({ children, markdownStyle, selectable = false }: Props) {
	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()

	const resolvedStyle = useMemo<MarkdownStyle>(
		() => ({
			paragraph: {
				color: colors.foreground.DEFAULT,
				fontSize: 15,
				lineHeight: 22,
				marginBottom: 8,
				...markdownStyle?.paragraph,
			},
			h1: { color: colors.foreground.DEFAULT, ...markdownStyle?.h1 },
			h2: { color: colors.foreground.DEFAULT, ...markdownStyle?.h2 },
			h3: { color: colors.foreground.DEFAULT, ...markdownStyle?.h3 },
			h4: { color: colors.foreground.DEFAULT, ...markdownStyle?.h4 },
			h5: { color: colors.foreground.DEFAULT, ...markdownStyle?.h5 },
			h6: { color: colors.foreground.DEFAULT, ...markdownStyle?.h6 },
			strong: { color: colors.foreground.DEFAULT, ...markdownStyle?.strong },
			em: { color: colors.foreground.DEFAULT, ...markdownStyle?.em },
			link: { color: colors.fill.brand.DEFAULT, underline: true, ...markdownStyle?.link },
			code: {
				color: colors.foreground.subtle,
				backgroundColor: colors.background.surface.DEFAULT,
				...markdownStyle?.code,
			},
			codeBlock: {
				color: colors.foreground.subtle,
				backgroundColor: colors.background.surface.DEFAULT,
				...markdownStyle?.codeBlock,
			},
			blockquote: {
				color: colors.foreground.muted,
				borderColor: colors.foreground.muted,
				...markdownStyle?.blockquote,
			},
			list: { color: colors.foreground.DEFAULT, ...markdownStyle?.list },
			// Card uses bg-black/5 dark:bg-white/10, dividers use bg-black/10 dark:bg-white/10
			table: {
				color: colors.foreground.DEFAULT,
				borderColor: isDarkColorScheme ? '#1a1a1a' : '#e6e6e6',
				borderRadius: 16,
				headerBackgroundColor: isDarkColorScheme ? '#262626' : '#ebebeb',
				headerTextColor: colors.foreground.muted,
				rowEvenBackgroundColor: isDarkColorScheme ? '#1a1a1a' : '#f2f2f2',
				rowOddBackgroundColor: isDarkColorScheme ? '#1f1f1f' : '#ededed',
				...markdownStyle?.table,
			},
		}),
		[colors, isDarkColorScheme, markdownStyle],
	)

	return (
		<EnrichedMarkdownText
			markdown={children}
			markdownStyle={resolvedStyle}
			selectable={selectable}
			allowTrailingMargin={false}
			flavor="github"
			// TODO(security): Put behind confirmation?
			onLinkPress={({ url }) => {
				if (url) Linking.openURL(url)
			}}
		/>
	)
}
