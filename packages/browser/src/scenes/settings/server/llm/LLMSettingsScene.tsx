import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Button, Form, Input, PasswordInput } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { ContentContainer, SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

const query = graphql(`
	query ServerConfigLLM {
		serverConfig {
			llmUrl
			llmModelName
		}
	}
`)

const mutation = graphql(`
	mutation UpdateLlmConfig($url: String, $modelName: String, $apiKey: String) {
		updateLlmConfig(url: $url, modelName: $modelName, apiKey: $apiKey) {
			llmUrl
			llmModelName
		}
	}
`)

const LOCALE_BASE = 'settingsScene.server/llm.sections.llm'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

export default function LLMSettingsScene() {
	const { t, translate } = useTranslate()
	const client = useQueryClient()

	const {
		data: { serverConfig },
	} = useSuspenseGraphQL(query, ['serverConfig', 'llm'])

	const schema = z.object({
		url: z
			.string()
			.trim()
			.url({ message: translate('shared.common.invalidUrl') })
			.or(z.literal('')),
		apiKey: z.string(),
		modelName: z.string(),
	})
	type Schema = z.infer<typeof schema>

	const form = useForm<Schema>({
		defaultValues: {
			apiKey: '',
			modelName: serverConfig.llmModelName ?? '',
			url: serverConfig.llmUrl ?? '',
		},
		mode: 'onSubmit',
		resolver: zodResolver(schema),
	})

	const [url, apiKey, modelName] = useWatch({
		control: form.control,
		name: ['url', 'apiKey', 'modelName'],
		defaultValue: {
			apiKey: '',
			modelName: serverConfig.llmModelName ?? '',
			url: serverConfig.llmUrl ?? '',
		},
	})

	const hasChanges =
		(url ?? '') !== (serverConfig.llmUrl ?? '') ||
		(modelName ?? '') !== (serverConfig.llmModelName ?? '') ||
		!!apiKey

	const { mutate: updateLlmConfig, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLlmConfig: updatedConfig }) => {
			client.setQueryData(['serverConfig', 'llm'], {
				serverConfig: {
					llmModelName: updatedConfig.llmModelName,
					llmUrl: updatedConfig.llmUrl,
				},
			})
			form.reset({
				apiKey: '',
				modelName: updatedConfig.llmModelName ?? '',
				url: updatedConfig.llmUrl ?? '',
			})
			toast.success(t(getKey('updateSuccess')))
		},
		onError: (error) => {
			console.error(error)
			toast.error(t(getKey('updateFailed')), {
				description:
					error instanceof Error ? error.message : translate('shared.common.unknownError'),
			})
		},
	})

	const handleSubmit = async ({ url, apiKey, modelName }: Schema) => {
		updateLlmConfig({
			// an empty string will clear the value on the server, undefined means no change
			apiKey: apiKey || undefined,
			modelName: modelName.trim(),
			url: url.trim(),
		})
	}

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/llm.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="gap-12 flex flex-col">
					<Form form={form} onSubmit={handleSubmit}>
						<div className="gap-6 md:max-w-sm flex flex-col">
							<Input
								className="w-full"
								containerClassName="max-w-full md:max-w-sm"
								label={t(getKey('url.label'))}
								description={t(getKey('url.description'))}
								placeholder="https://api.example.com/v1"
								errorMessage={form.formState.errors.url?.message}
								{...form.register('url')}
							/>

							<PasswordInput
								className="w-full"
								containerClassName="max-w-full md:max-w-sm"
								label={t(getKey('apiKey.label'))}
								description={t(getKey('apiKey.description'))}
								autoComplete="new-password"
								{...form.register('apiKey')}
							/>

							<Input
								className="w-full"
								containerClassName="max-w-full md:max-w-sm"
								label={t(getKey('modelName.label'))}
								description={t(getKey('modelName.description'))}
								placeholder="gpt-4o"
								{...form.register('modelName')}
							/>

							<Button
								type="submit"
								className="md:w-[unset] w-full"
								disabled={!hasChanges || isPending}
							>
								{t('shared.common.save')}
							</Button>
						</div>
					</Form>
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
