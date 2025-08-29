import { Alert, AlertDescription, Label, NativeSelect, Text } from '@stump/components'
import { EntityVisibility } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { SmartListFormSchema } from '../schema'

type SubSchema = Pick<SmartListFormSchema, 'visibility'>

type Props = {
	isCreating?: boolean
}

// TODO(graphql): Fix
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
				<Alert variant="info" className="-mt-4 max-w-lg">
					<AlertDescription>{t(getOptionKey(visibility, 'createDisclaimer'))}</AlertDescription>
				</Alert>
			)}
		</>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.visibility'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (option: EntityVisibility, key: string) =>
	getKey(`options.${option.toLowerCase()}.${key}`)
