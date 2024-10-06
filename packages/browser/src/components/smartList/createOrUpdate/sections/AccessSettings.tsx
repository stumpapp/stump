import { Alert, Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { EntityVisibility } from '@stump/types'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { SmartListFormSchema } from '../schema'

type SubSchema = Pick<SmartListFormSchema, 'visibility'>

type Props = {
	isCreating?: boolean
}

export default function AccessSettings({ isCreating }: Props) {
	const form = useFormContext<SubSchema>()
	const visibility = form.watch('visibility')

	const { t } = useLocaleContext()

	return (
		<>
			<div className="flex max-w-xs flex-col gap-y-1.5">
				<Label>{t(getKey('label'))}</Label>
				<NativeSelect
					options={[
						{ label: t(getOptionKey('PUBLIC', 'label')), value: 'PUBLIC' },
						{ label: t(getOptionKey('SHARED', 'label')), value: 'SHARED' },
						{ label: t(getOptionKey('PRIVATE', 'label')), value: 'PRIVATE' },
					]}
					{...form.register('visibility')}
				/>
				<Text variant="muted" size="sm">
					{t(getOptionKey(visibility, 'description'))}
				</Text>
			</div>

			{isCreating && visibility === 'SHARED' && (
				<Alert level="info" className="-mt-4 max-w-lg">
					<Alert.Content>{t(getOptionKey(visibility, 'createDisclaimer'))}</Alert.Content>
				</Alert>
			)}
		</>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.visibility'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (option: EntityVisibility, key: string) =>
	getKey(`options.${option.toLowerCase()}.${key}`)
