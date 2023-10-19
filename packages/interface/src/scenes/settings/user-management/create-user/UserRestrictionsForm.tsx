import { CheckBox, Divider, Heading, Input, Link, Text } from '@stump/components'
import React, { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { useLocaleContext } from '../../../../i18n'
import paths from '../../../../paths'
import { Schema } from './CreateUserForm'

const LOCAL_BASE = 'settingsScene.createUsers.accessControl'
const getLocaleKey = (path: string) => `${LOCAL_BASE}.${path}`
const getAgeRestrictionKey = (path: string) => `${getLocaleKey('ageRestriction')}.${path}`

// TODO: refactor to resuse in updating a user...
export default function UserRestrictionsForm() {
	const { t } = useLocaleContext()

	const form = useFormContext<Schema>()

	const [age_restriction_on_unset, age_restriction] = form.watch([
		'age_restriction_on_unset',
		'age_restriction',
	])

	useEffect(
		() => {
			if (age_restriction == undefined || isNaN(age_restriction)) {
				form.setValue('age_restriction_on_unset', undefined)
				form.clearErrors('age_restriction')
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[age_restriction],
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
		<div className="pb-4 pt-1">
			<Heading size="xs">Access control and restrictions</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{renderDescription()}
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-start">
					<Input
						variant="primary"
						type="number"
						label={t(getAgeRestrictionKey('label'))}
						description={t(getAgeRestrictionKey('description'))}
						descriptionPosition="top"
						{...form.register('age_restriction', {
							required: false,
							valueAsNumber: true,
						})}
						errorMessage={form.formState.errors.age_restriction?.message}
					/>

					<CheckBox
						id="age_restriction_enabled"
						label={t(getAgeRestrictionKey('enforceUnset.label'))}
						description={t(getAgeRestrictionKey('enforceUnset.description'))}
						checked={!!age_restriction_on_unset}
						onClick={() => form.setValue('age_restriction_on_unset', !age_restriction_on_unset)}
						disabled={!age_restriction || age_restriction < 1}
					/>
				</div>
			</div>
		</div>
	)
}
