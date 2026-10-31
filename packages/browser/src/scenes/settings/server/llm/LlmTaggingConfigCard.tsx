import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Button, Form, Input, Label, NativeSelect, Switch } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useTranslate } from '@/hooks/useTranslate'

const query = graphql(`
	query LlmTaggingConfigSettings {
		llmTaggingConfig {
			enabled
			autoApplyThreshold
			requestsPerSecond
			concurrency
			dailyRequestLimit
			batchSize
			maxSummaryChars
			batchScope
		}
	}
`)

const mutation = graphql(`
	mutation UpdateLlmTaggingConfig($config: JSON!) {
		updateLlmTaggingConfig(config: $config) {
			enabled
			autoApplyThreshold
			requestsPerSecond
			concurrency
			dailyRequestLimit
			batchSize
			maxSummaryChars
			batchScope
		}
	}
`)

const LOCALE_BASE = 'settingsScene.server/llm.sections.tagging'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

const optionalNumber = (min: number, max: number) =>
	z
		.string()
		.trim()
		.refine(
			(value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= min && Number(value) <= max),
			{ message: `${min} - ${max}` },
		)

export default function LlmTaggingConfigCard() {
	const { t, translate } = useTranslate()
	const client = useQueryClient()

	const {
		data: { llmTaggingConfig },
	} = useSuspenseGraphQL(query, ['llmTaggingConfig', 'server/llm'])

	const schema = z.object({
		enabled: z.boolean(),
		autoApplyThreshold: optionalNumber(0, 1),
		requestsPerSecond: optionalNumber(0.01, 100),
		concurrency: optionalNumber(1, 64),
		dailyRequestLimit: optionalNumber(1, 100000),
		batchSize: optionalNumber(10, 1000),
		maxSummaryChars: optionalNumber(0, 4000),
		batchScope: z.enum(['NEW_BOOKS_ONLY', 'ALL_BOOKS']),
	})
	type Schema = z.infer<typeof schema>

	const form = useForm<Schema>({
		defaultValues: {
			enabled: llmTaggingConfig.enabled,
			autoApplyThreshold:
				llmTaggingConfig.autoApplyThreshold != null
					? String(llmTaggingConfig.autoApplyThreshold)
					: '',
			requestsPerSecond: String(llmTaggingConfig.requestsPerSecond),
			concurrency: String(llmTaggingConfig.concurrency),
			dailyRequestLimit: String(llmTaggingConfig.dailyRequestLimit),
			batchSize: String(llmTaggingConfig.batchSize),
			maxSummaryChars: String(llmTaggingConfig.maxSummaryChars),
			batchScope: llmTaggingConfig.batchScope,
		},
		mode: 'onSubmit',
		resolver: zodResolver(schema),
	})

	const [enabled] = useWatch({
		control: form.control,
		name: ['enabled'],
	})

	const { mutate: updateConfig, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLlmTaggingConfig: updated }) => {
			client.setQueryData(['llmTaggingConfig', 'server/llm'], {
				llmTaggingConfig: updated,
			})
			toast.success(t(getKey('updateSuccess')))
		},
		onError: (error) => {
			console.error(error)
			toast.error(t(getKey('updateFailed')))
		},
	})

	const handleSubmit = useCallback(
		({
			enabled,
			autoApplyThreshold,
			requestsPerSecond,
			concurrency,
			dailyRequestLimit,
			batchSize,
			maxSummaryChars,
			batchScope,
		}: Schema) => {
			updateConfig({
				config: {
					enabled,
					autoApplyThreshold:
						autoApplyThreshold.trim() === '' ? null : Number(autoApplyThreshold),
					requestsPerSecond: Number(requestsPerSecond),
					concurrency: Number(concurrency),
					dailyRequestLimit: Number(dailyRequestLimit),
					batchSize: Number(batchSize),
					maxSummaryChars: Number(maxSummaryChars),
					batchScope,
				},
			})
		},
		[updateConfig],
	)

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<div className="gap-6 flex flex-col">
				<Switch
					label={t(getKey('fields.enabled.label'))}
					containerClassName="max-w-full md:max-w-sm"
					checked={enabled}
					onCheckedChange={(checked) => form.setValue('enabled', checked)}
				/>

				<Input
					className="w-full"
					containerClassName="max-w-full md:max-w-sm"
					label={t(getKey('fields.autoApplyThreshold.label'))}
					description={t(getKey('fields.autoApplyThreshold.description'))}
					placeholder="0.9"
					errorMessage={form.formState.errors.autoApplyThreshold?.message}
					{...form.register('autoApplyThreshold')}
				/>

				<Input
					className="w-full"
					containerClassName="max-w-full md:max-w-sm"
					label={t(getKey('fields.requestsPerSecond.label'))}
					description={t(getKey('fields.requestsPerSecond.description'))}
					placeholder="0.5"
					errorMessage={form.formState.errors.requestsPerSecond?.message}
					{...form.register('requestsPerSecond')}
				/>

				<Input
					className="w-full"
					containerClassName="max-w-full md:max-w-sm"
					label={t(getKey('fields.concurrency.label'))}
					description={t(getKey('fields.concurrency.description'))}
					placeholder="4"
					errorMessage={form.formState.errors.concurrency?.message}
					{...form.register('concurrency')}
				/>

				<Input
					className="w-full"
					containerClassName="max-w-full md:max-w-sm"
					label={t(getKey('fields.dailyRequestLimit.label'))}
					description={t(getKey('fields.dailyRequestLimit.description'))}
					placeholder="2000"
					errorMessage={form.formState.errors.dailyRequestLimit?.message}
					{...form.register('dailyRequestLimit')}
				/>

				<Input
					className="w-full"
					containerClassName="max-w-full md:max-w-sm"
					label={t(getKey('fields.batchSize.label'))}
					description={t(getKey('fields.batchSize.description'))}
					placeholder="200"
					errorMessage={form.formState.errors.batchSize?.message}
					{...form.register('batchSize')}
				/>

				<Input
					className="w-full"
					containerClassName="max-w-full md:max-w-sm"
					label={t(getKey('fields.maxSummaryChars.label'))}
					description={t(getKey('fields.maxSummaryChars.description'))}
					placeholder="400"
					errorMessage={form.formState.errors.maxSummaryChars?.message}
					{...form.register('maxSummaryChars')}
				/>

				<div className="flex max-w-full flex-col gap-1.5 md:max-w-sm">
					<Label>{t(getKey('fields.batchScope.label'))}</Label>
					<NativeSelect
						className="w-full"
						options={[
							{
								label: t(getKey('fields.batchScope.newBooksOnly')),
								value: 'NEW_BOOKS_ONLY',
							},
							{
								label: t(getKey('fields.batchScope.allBooks')),
								value: 'ALL_BOOKS',
							},
						]}
						{...form.register('batchScope')}
					/>
					<p className="text-xs text-muted-foreground">
						{t(getKey('fields.batchScope.description'))}
					</p>
				</div>

				<Button type="submit" className="md:w-[unset] w-full" disabled={isPending}>
					{translate('shared.common.save')}
				</Button>
			</div>
		</Form>
	)
}
