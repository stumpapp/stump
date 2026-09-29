import { Text } from './ui'

// TODO: ability to style replaced nodes a bit more
type Props = {
	fakeTranslation: string
	values: Record<string, string>
	className?: string
}

/// A component that will take a partially-translated string and replace each templated
// placeholder (e.g., REPLACE_ME) with the corresponding correct translated value
export function TemplatedTranslationText({ fakeTranslation, values, className }: Props) {
	const replacements = Object.entries(values)
		.map(([key, node]) => ({ key, index: fakeTranslation.indexOf(key), node }))
		.filter(({ index }) => index !== -1)
		.sort((a, b) => a.index - b.index)

	const parts: React.ReactNode[] = []

	if (replacements.length === 0) {
		parts.push(fakeTranslation)
	} else {
		let cursor = 0
		for (const { key, index, node } of replacements) {
			parts.push(fakeTranslation.slice(cursor, index))
			parts.push(
				<Text key={key} className="font-medium text-foreground">
					{node}
				</Text>,
			)
			cursor = index + key.length
		}
		parts.push(fakeTranslation.slice(cursor))
	}

	return <Text className={className}>{parts}</Text>
}
