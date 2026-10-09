import { Label, NativeSelect, Text } from '@stump/components'
import { LibraryType } from '@stump/graphql'
import { useFormContext } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function LibraryTypeSelect() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const { t, translate } = useTranslate()

	return (
		<div className="gap-2 flex flex-col">
			<Label>{t(getKey('label'))}</Label>
			<NativeSelect
				options={OPTIONS.map((option) => ({
					value: option,
					label: translate(`shared.libraryType.${option}`),
				}))}
				{...form.register('libraryType')}
			/>
			<Text size="xs" variant="muted">
				{t(getKey('description'))}
			</Text>
		</div>
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
