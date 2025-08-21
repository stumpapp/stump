import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, Form, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useSmartListContext } from '../../context'

const LOCALE_BASE_KEY = 'userSmartListScene.itemsScene.actionHeader.viewManager.modal'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

type Props = {
	isCreating: boolean
	isOpen: boolean
	onClose: () => void
}
export default function CreateOrUpdateTableView({ isCreating, isOpen, onClose }: Props) {
	const { t } = useLocaleContext()
	const {
		list: { views },
		selectedView,
		saveWorkingView,
		saveSelectedStoredView,
	} = useSmartListContext()

	const form = useForm({
		defaultValues: {
			name: isCreating ? '' : selectedView?.name || '',
		},
		resolver: zodResolver(buildSchema(views?.map((view) => view.name) || [], selectedView?.name)),
	})

	/**
	 * An effect to reset the form when the selected view changes
	 */
	useEffect(() => {
		form.reset({
			name: isCreating ? '' : selectedView?.name || '',
		})
	}, [isCreating, selectedView, form])

	/**
	 * A callback to translate a form control
	 */
	const translateControl = useCallback(
		(key: string) =>
			isCreating ? t(withLocaleKey(`createForm.${key}`)) : t(withLocaleKey(`updateForm.${key}`)),
		[t, isCreating],
	)

	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			onClose()
		}
	}

	/**
	 * A submit handler to either save the working view as a new, stored view, or to
	 * update the currently selected stored view with the working view changes
	 */
	const handleSubmit = useCallback(
		async ({ name }: z.infer<ReturnType<typeof buildSchema>>) => {
			try {
				if (isCreating) {
					await saveWorkingView(name)
				} else {
					await saveSelectedStoredView(name)
				}
				onClose()
			} catch (error) {
				console.error(error)
				if (error instanceof Error) {
					toast.error(
						`Failed to ${isCreating ? 'create' : 'update'} view${
							error.message ? `: ${error.message}` : ''
						}`,
					)
				} else {
					toast.error(`Failed to ${isCreating ? 'create' : 'update'} view`)
				}
			}
		},
		[isCreating, saveWorkingView, saveSelectedStoredView, onClose],
	)

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>
						{isCreating ? t(withLocaleKey('heading.create')) : t(withLocaleKey('heading.update'))}
					</Dialog.Title>
					<Dialog.Description>
						{isCreating
							? t(withLocaleKey('description.create'))
							: `${t(withLocaleKey('description.update'))}} "${selectedView?.name}"`}
					</Dialog.Description>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				<Form id="create-or-update-view" form={form} onSubmit={handleSubmit}>
					<Input
						label={translateControl('name.label')}
						description={translateControl('name.description')}
						placeholder={translateControl('name.placeholder')}
						required
						autoFocus
						errorMessage={form.formState.errors.name?.message}
						variant="primary"
						{...form.register('name')}
					/>
				</Form>

				<Dialog.Footer>
					<Button onClick={onClose}>Cancel</Button>
					<Button form="create-or-update-view">
						{isCreating ? t('common.create') : t('common.saveChanges')}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const buildSchema = (existingNames: string[], currentName?: string) =>
	z.object({
		name: z
			.string()
			.min(1, 'Name must be at least 1 character long')
			.refine(
				(name) => !existingNames.includes(name) || name === currentName,
				'Name must be unique',
			),
	})
