import { CheckBox, Heading, Input, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import paths from '@/paths'

import { Schema } from './CreateOrUpdateUserForm'

const LOCAL_BASE = 'settingsScene.server/users.createOrUpdateForm.accessControl'
const getLocaleKey = (path: string) => `${LOCAL_BASE}.${path}`
const getAgeRestrictionKey = (path: string) => `${getLocaleKey('ageRestriction')}.${path}`

export default function UserRestrictionsForm() {
	const { t } = useLocaleContext()

	const form = useFormContext<Schema>()

	const [age_restriction_on_unset, age_restriction] = form.watch([
		'age_restriction_on_unset',
		'age_restriction',
	])

	useEffect(
		() => {
			if (age_restriction == undefined) {
				form.setValue('age_restriction_on_unset', undefined)
				form.clearErrors('age_restriction')
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[age_restriction],
	)

	const handleAgeRestrictionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = e.target

		if (value === '' || value == undefined) {
			form.setValue('age_restriction', undefined)
		} else {
			const parsed = parseInt(value)
			if (!isNaN(parsed)) {
				form.setValue('age_restriction', parsed)
			}
		}
	}

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
						variant="primary"
						type="number"
						label={t(getAgeRestrictionKey('label'))}
						description={t(getAgeRestrictionKey('description'))}
						descriptionPosition="top"
						defaultValue={age_restriction}
						errorMessage={form.formState.errors.age_restriction?.message}
						onChange={handleAgeRestrictionChange}
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

				{/* TODO: TagSelect */}
			</div>
		</div>
	)
}
