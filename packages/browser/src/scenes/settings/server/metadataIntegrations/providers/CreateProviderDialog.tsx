import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation } from '@stump/client'
import { Button, Dialog, Form } from '@stump/components'
import { extractErrorMessage, graphql, MergeStrategy, MetadataProvider } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { PROVIDER_LABELS, PROVIDERS } from './constants'
import ProviderForm from './ProviderForm'
import ProviderSelectionCard from './ProviderSelectionCard'
import { createConfig, CreateProviderConfigSchema } from './schema'

const createProviderMutation = graphql(`
	mutation CreateProviderDialogCreateProvider($input: CreateMetadataProviderConfigInput!) {
		createMetadataProvider(input: $input) {
			id
			providerType
			enabled
		}
	}
`)

export function CreateProviderDialog() {
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [step, setStep] = useState(0)
	const client = useQueryClient()

	const { t } = useLocaleContext()

	const form = useForm<CreateProviderConfigSchema>({
		defaultValues: {
			providerType: undefined,
			enabled: true,
			apiToken: '',
			apiTokenExpiresAt: null,
			autoApplyConfig: {
				enabled: false,
				threshold: 0.95,
				strategy: MergeStrategy.FillGaps,
				excludeFields: [],
			},
		},
		resolver: zodResolver(createConfig),
	})

	const selectedProvider = useWatch({
		control: form.control,
		name: 'providerType',
	})

	const { mutate, isPending } = useGraphQLMutation(createProviderMutation, {
		onSuccess: async () => {
			await client.invalidateQueries({
				predicate: (q) =>
					q.queryKey.some((k) => typeof k === 'string' && k.includes('metadataProvider')),
			})
			handleClose()
		},
		onError: (error) => {
			const message = extractErrorMessage(error)
			toast.error(t('settingsScene.server/metadataIntegrations.createProviderError'), {
				description: message,
			})
		},
	})

	const handleClose = () => {
		setIsDialogOpen(false)
		setStep(0)
		form.reset()
	}

	const handleSelectProvider = (provider: MetadataProvider) => {
		form.setValue('providerType', provider)
		setStep(1)
	}

	const handleSubmit = (data: CreateProviderConfigSchema) => mutate({ input: data })

	const onSecondaryButtonClick = () => {
		if (step === 1) {
			setStep(0)
		} else {
			handleClose()
		}
	}

	const dialogTitle =
		step === 0 ? 'Choose provider' : (PROVIDER_LABELS[selectedProvider || ''] ?? 'Provider')

	return (
		<>
			<Button
				className="shrink-0"
				variant="secondary"
				size="sm"
				onClick={() => setIsDialogOpen(true)}
			>
				{t('settingsScene.server/metadataIntegrations.addProvider')}
			</Button>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<Dialog.Content size="md" className="max-h-full overflow-y-auto">
					<Dialog.Header>
						<Dialog.Title>{dialogTitle}</Dialog.Title>
						<Dialog.Close onClick={handleClose} />
					</Dialog.Header>

					<Form form={form} onSubmit={handleSubmit} id="create-provider-form" className="py-2">
						{step === 0 && (
							<div className="gap-4 grid grid-cols-2">
								{PROVIDERS.map((provider) => (
									<ProviderSelectionCard
										key={provider}
										provider={provider}
										onSelect={handleSelectProvider}
									/>
								))}
							</div>
						)}

						{step === 1 && <ProviderForm />}
					</Form>

					<Dialog.Footer>
						<Button onClick={onSecondaryButtonClick} disabled={isPending} variant="outline">
							{step === 1 ? t('common.back') : t('common.cancel')}
						</Button>

						{step === 0 && !!selectedProvider && (
							<Button
								type="button"
								disabled={isPending}
								isLoading={isPending}
								onClick={() => setStep(1)}
							>
								{t('common.continue')}
							</Button>
						)}

						{step === 1 && (
							<Button
								type="submit"
								form="create-provider-form"
								disabled={isPending}
								isLoading={isPending}
							>
								{t('common.create')}
							</Button>
						)}
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</>
	)
}
