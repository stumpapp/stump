import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation } from '@stump/client'
import { Button, ConfirmationModal, Dialog, Form, ToolTip } from '@stump/components'
import { ExistingProviderCardFragment, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import omit from 'lodash/omit'
import { Cog } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { PROVIDER_LABELS } from './constants'
import ProviderForm from './ProviderForm'
import { createConfig, getPatchDefaults, PatchProviderConfigSchema } from './schema'

const mutation = graphql(`
	mutation EditProviderDialog($id: Int!, $input: PatchMetadataProviderConfigInput!) {
		updateMetadataProvider(id: $id, input: $input) {
			id
			...ExistingProviderCard
		}
	}
`)

const deleteMutation = graphql(`
	mutation DeleteProviderDialog($id: Int!) {
		deleteMetadataProvider(id: $id) {
			id
		}
	}
`)

type Props = {
	provider: ExistingProviderCardFragment
}

export function EditProviderDialog({ provider }: Props) {
	const client = useQueryClient()

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

	const form = useForm<PatchProviderConfigSchema>({
		defaultValues: getPatchDefaults(provider),
		resolver: zodResolver(createConfig),
	})

	const { t } = useLocaleContext()

	const onSuccess = async () => {
		await client.invalidateQueries({
			predicate: (q) =>
				q.queryKey.some((k) => typeof k === 'string' && k.includes('metadataProvider')),
		})
		handleClose()
	}

	const { mutate: editProvider, isPending: isEditPending } = useGraphQLMutation(mutation, {
		onSuccess: onSuccess,
	})

	const { mutate: deleteProvider, isPending: isDeletePending } = useGraphQLMutation(
		deleteMutation,
		{
			onSuccess: onSuccess,
		},
	)

	const handleClose = () => {
		setIsEditDialogOpen(false)
		setTimeout(() => form.reset(getPatchDefaults(provider)))
	}

	const handleSubmit = (data: PatchProviderConfigSchema) => {
		editProvider({
			id: provider.id,
			input: omit(data, 'providerType'),
		})
	}

	const dialogTitle = PROVIDER_LABELS[provider.providerType] ?? 'Provider'

	const isPending = isEditPending || isDeletePending

	return (
		<>
			<ToolTip content="Edit provider" align="end" size="xs">
				<Button
					onClick={() => setIsEditDialogOpen(true)}
					size="icon"
					className="h-7 w-7 p-0 rounded-full border border-border bg-muted"
				>
					<Cog className="h-4 w-4 text-primary" strokeWidth={1} />
				</Button>
			</ToolTip>

			<Dialog open={isEditDialogOpen} onOpenChange={handleClose}>
				<Dialog.Content size="md">
					<Dialog.Header>
						<Dialog.Title>{dialogTitle}</Dialog.Title>
						<Dialog.Close onClick={handleClose} />
					</Dialog.Header>

					<Form form={form} onSubmit={handleSubmit} id="edit-provider-form" className="py-2">
						<ProviderForm />
					</Form>

					<Dialog.Footer>
						<Button
							variant="destructive"
							onClick={() => setIsDeleteDialogOpen(true)}
							disabled={isPending}
						>
							{t('common.delete')}
						</Button>

						<div className="flex-1" />

						<Button variant="outline" onClick={handleClose} disabled={isPending}>
							{t('common.cancel')}
						</Button>

						<Button
							type="submit"
							form="edit-provider-form"
							disabled={isPending}
							isLoading={isEditPending}
						>
							{t('common.saveChanges')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

			<ConfirmationModal
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				onConfirm={() => deleteProvider({ id: provider.id })}
				title={t(getDeleteDialogKey('title'))}
				description={t(getDeleteDialogKey('description')).replace('{{providerName}}', dialogTitle)}
			/>
		</>
	)
}

const LOCALE_KEY = 'settingsScene.server/metadataIntegrations'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getDeleteDialogKey = (key: string) => getKey(`deleteDialog.${key}`)
