import { CheckBox, Heading, Input, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import paths from '@/paths'

import { CreateOrUpdateUserSchema } from './schema'

const LOCAL_BASE = 'settingsScene.server/users.createOrUpdateForm.accessControl'
const getLocaleKey = (path: string) => `${LOCAL_BASE}.${path}`
const getAgeRestrictionKey = (path: string) => `${getLocaleKey('ageRestriction')}.${path}`

export default function UserRestrictionsForm() {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateUserSchema>()

	const [ageRestrictionOnUnset, ageRestriction] = form.watch([
		'ageRestrictionOnUnset',
		'ageRestriction',
	])

	useEffect(() => {
		const didChange = ageRestriction !== form.getValues('ageRestriction')
		if (ageRestriction == undefined && didChange) {
			form.setValue('ageRestrictionOnUnset', undefined)
			form.clearErrors('ageRestriction')
		}
	}, [form, ageRestriction])

	const handleAgeRestrictionChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target

			if (value === '' || value == undefined) {
				form.setValue('ageRestriction', undefined)
				form.setValue('ageRestrictionOnUnset', undefined)
			} else {
				const parsed = parseInt(value)
				if (!isNaN(parsed)) {
					form.setValue('ageRestriction', parsed)
				}
			}
		},
		[form],
	)

	const renderDescription = () => {
		const description = t(getLocaleKey('subtitle.0'))
		const documentation = t(getLocaleKey('subtitle.1'))

		return (
			<>
				{description}{' '}
				<Link href={paths.docs('access-control')} target="_blank" rel="noopener noreferrer">
					{documentation}
				</Link>
			</>
		)
	}

	return (
		<div className="flex flex-col gap-y-4">
			<div>
				<Heading size="sm">Access control</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{renderDescription()}
				</Text>
			</div>

			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-start">
					<Input
						id="ageRestriction"
						variant="primary"
						type="number"
						label={t(getAgeRestrictionKey('label'))}
						description={t(getAgeRestrictionKey('description'))}
						descriptionPosition="top"
						defaultValue={ageRestriction}
						errorMessage={form.formState.errors.ageRestriction?.message}
						onChange={handleAgeRestrictionChange}
					/>

					<CheckBox
						id="age_restriction_enabled"
						label={t(getAgeRestrictionKey('enforceUnset.label'))}
						description={t(getAgeRestrictionKey('enforceUnset.description'))}
						checked={!!ageRestrictionOnUnset}
						onClick={() => form.setValue('ageRestrictionOnUnset', !ageRestrictionOnUnset)}
						disabled={!ageRestriction || ageRestriction < 1}
					/>
				</div>

				{/* TODO: TagSelect */}
			</div>
		</div>
	)
}
