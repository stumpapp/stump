import { NewCard, Select } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'
import { TextCase, useLocalPreferencesStore } from '@/stores/user'

export function TextCaseSelect() {
	const textCase = useLocalPreferencesStore((store) => store.textCase)
	const patch = useLocalPreferencesStore((store) => store.patch)

	const { translate } = useTranslate()

	return (
		<NewCard.Row label={translate(getKey('label'))}>
			<div>
				<Select
					value={textCase}
					onValueChange={(newCase) =>
						patch({
							textCase: intoCase(newCase),
						})
					}
				>
					<Select.Trigger size="sm">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{['sentenceCase', 'lowerCase', 'titleCase'].map((option) => (
							<Select.Item key={option} value={option}>
								{translate(getKey(`options.${option}`))}
							</Select.Item>
						))}
					</Select.Content>
				</Select>
			</div>
		</NewCard.Row>
	)
}

function intoCase(value: string): TextCase {
	if (['sentenceCase', 'lowerCase', 'titleCase'].includes(value)) return value as TextCase
	return 'sentenceCase'
}

const getKey = (key: string) => `shared.textCase.${key}`
