import { NewCard, Select } from '@stump/components'
import { LibraryType } from '@stump/graphql'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function LibraryTypeSelect() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const value = useWatch({
		control: form.control,
		name: 'libraryType',
	})
	const { t, translate } = useTranslate()

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<div>
				<Select
					value={value}
					onValueChange={(value) => form.setValue('libraryType', value as LibraryType)}
				>
					<Select.Trigger>
						<Select.Value />
					</Select.Trigger>

					<Select.Content>
						{OPTIONS.map((option) => (
							<Select.Item key={option} value={option}>
								{translate(`shared.libraryType.${option}`)}
							</Select.Item>
						))}
					</Select.Content>
				</Select>
			</div>
		</NewCard.Row>
	)
}

const OPTIONS = [
	LibraryType.Book,
	LibraryType.Comic,
	LibraryType.LightNovel,
	LibraryType.Manga,
	LibraryType.Manhwa,
	LibraryType.Mixed,
	LibraryType.WebNovel,
	LibraryType.Webtoon,
]

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.libraryType'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
