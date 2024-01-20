import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, Form, Input } from '@stump/components'
import React, { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { useSmartListContext } from '../../context'

type Props = {
	isCreating: boolean
	isOpen: boolean
	onClose: () => void
}
export default function CreateOrUpdateTableView({ isCreating, isOpen, onClose }: Props) {
	const {
		list: { saved_views },
		selectedView,
		saveWorkingView,
		saveSelectedStoredView,
	} = useSmartListContext()

	const form = useForm({
		defaultValues: {
			name: isCreating ? '' : selectedView?.name || '',
		},
		resolver: zodResolver(
			buildSchema(saved_views?.map((view) => view.name) || [], selectedView?.name),
		),
	})

	/**
	 * An effect to reset the form when the selected view changes
	 */
	useEffect(() => {
		form.reset({
			name: isCreating ? '' : selectedView?.name || '',
		})
	}, [isCreating, selectedView, form])

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
					<Dialog.Title>{isCreating ? 'Create' : 'Update'} view</Dialog.Title>
					<Dialog.Description>
						{isCreating
							? 'Create a new view for this list'
							: `Update the view "${selectedView?.name}"`}
					</Dialog.Description>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				<Form id="create-or-update-view" form={form} onSubmit={handleSubmit}>
					<Input
						label="Name"
						description={
							isCreating
								? 'A friendly name to uniquely identify this view'
								: 'The updated name for this view, if desired'
						}
						placeholder="Name"
						required
						autoFocus
						errorMessage={form.formState.errors.name?.message}
						variant="primary"
						{...form.register('name')}
					/>
				</Form>

				<Dialog.Footer>
					<Button onClick={onClose}>Cancel</Button>
					<Button form="create-or-update-view">{isCreating ? 'Create' : 'Save changes'}</Button>
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
