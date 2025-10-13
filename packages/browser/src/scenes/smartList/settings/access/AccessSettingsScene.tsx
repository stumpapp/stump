import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { EntityVisibility } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
	AccessSettings,
	createSchema,
	intoForm,
	SmartListFormSchema,
} from '@/components/smartList/createOrUpdate'

import { useSmartListSettings } from '../context'
import ChangeVisibilityConfirmation from './ChangeVisibilityConfirmation'
import UserAccessManager from './UserAccessManager'

type SubSchema = Pick<SmartListFormSchema, 'visibility'>

export default function AccessSettingsScene() {
	const { t } = useLocaleContext()
	const { list, patch } = useSmartListSettings()

	const form = useForm<SubSchema>({
		defaultValues: intoForm(list),
		reValidateMode: 'onChange',
		resolver: zodResolver(createSchema([], t, list)),
	})
	const [visibility] = useWatch({
		control: form.control,
		name: ['visibility'],
	})
	const isChangedVisibility = visibility !== list.visibility

	const [showConfirmation, setShowConfirmation] = useState(false)

	const doChangeVisibility = useCallback(() => {
		// @ts-expect-error: It is satisfying the enum
		patch({ visibility })
		setShowConfirmation(false)
	}, [patch, visibility])

	const handleSubmit = useCallback(() => {
		if (isChangedVisibility && !showConfirmation) {
			setShowConfirmation(true)
		} else {
			doChangeVisibility()
		}
	}, [isChangedVisibility, showConfirmation, doChangeVisibility])

	const onCancel = useCallback(() => {
		setShowConfirmation(false)
		setTimeout(() => {
			form.setValue('visibility', list.visibility)
		})
	}, [list, form])

	useEffect(() => {
		if (isChangedVisibility) {
			const el = document.querySelector('button[type="submit"]') as HTMLButtonElement | null
			el?.click()
		}
	}, [isChangedVisibility])

	return (
		<>
			<ChangeVisibilityConfirmation
				isOpen={showConfirmation}
				onCancel={onCancel}
				onConfirm={doChangeVisibility}
				target={visibility as EntityVisibility}
			/>

			<div className="flex flex-col gap-12">
				<Form form={form} onSubmit={handleSubmit} fieldsetClassName="flex flex-col gap-12">
					<AccessSettings />

					<button className="hidden" type="submit" disabled={!isChangedVisibility} />
				</Form>

				{list.visibility === 'SHARED' && <UserAccessManager />}
			</div>
		</>
	)
}
