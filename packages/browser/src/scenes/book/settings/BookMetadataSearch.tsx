import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import {
	Alert,
	AlertDescription,
	Button,
	Dialog,
	Form,
	Input,
	Label,
	NativeSelect,
} from '@stump/components'
import { extractErrorMessage, graphql, MergeStrategy, MetadataProvider } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Info } from 'lucide-react'
import { Suspense, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { MatchRecord, useMatchReviewStore } from '@/components/metadata/metadataMatching'
import { PROVIDER_LABELS } from '@/scenes/settings/server/metadataIntegrations/providers/constants'

const providersQuery = graphql(`
	query BookMetadataSearchProviders {
		metadataProviderConfigs {
			id
			providerType
			enabled
		}
	}
`)

const mediaContextQuery = graphql(`
	query BookMetadataSearchContext($id: ID!) {
		mediaById(id: $id) {
			id
			series {
				id
				metadata {
					comicid
				}
			}
		}
	}
`)

const searchMutation = graphql(`
	mutation SearchMediaMetadata($id: ID!, $search: MediaMetadataSearchInput) {
		fetchMediaMetadata(id: $id, search: $search) {
			...PendingMatchRecord
		}
	}
`)

type Props = {
	mediaId: string
	initialTitle: string
	isOpen: boolean
	onClose: () => void
}

export default function BookMetadataSearch({ mediaId, initialTitle, isOpen, onClose }: Props) {
	const { t } = useLocaleContext()

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>{t(getKey('heading'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('description'))}</Dialog.Description>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				{isOpen && (
					<Suspense fallback={null}>
						<BookMetadataSearchForm
							mediaId={mediaId}
							initialTitle={initialTitle}
							onClose={onClose}
						/>
					</Suspense>
				)}
			</Dialog.Content>
		</Dialog>
	)
}

type FormProps = {
	mediaId: string
	initialTitle: string
	onClose: () => void
}

function BookMetadataSearchForm({ mediaId, initialTitle, onClose }: FormProps) {
	const { t } = useLocaleContext()

	const {
		data: { metadataProviderConfigs: providers },
	} = useSuspenseGraphQL(providersQuery, ['metadataProviderConfigs', 'bookMetadataSearch', mediaId])
	const enabledProviders = providers.filter((provider) => provider.enabled)

	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(mediaContextQuery, ['mediaById', 'bookMetadataSearch', mediaId], {
		id: mediaId,
	})
	const suggestedVolumeId = media?.series?.metadata?.comicid?.toString()

	const openReview = useMatchReviewStore((s) => s.open)

	const form = useForm<SearchFormValues>({
		resolver: zodResolver(searchFormSchema),
		defaultValues: {
			title: initialTitle,
			author: '',
			isbn: '',
			year: undefined,
			number: undefined,
			comicVineVolumeId: suggestedVolumeId ? String(suggestedVolumeId) : undefined,
			provider: undefined,
		},
	})

	useEffect(() => {
		if (suggestedVolumeId) {
			form.setValue('comicVineVolumeId', String(suggestedVolumeId))
		}
	}, [suggestedVolumeId, form])

	const { mutate, isPending } = useGraphQLMutation(searchMutation, {
		onSuccess: (data) => {
			// Fragment masking is a type-level construct only; the mutation response already
			// contains every field selected by the spread `...PendingMatchRecord` fragment.
			const record = data.fetchMediaMetadata as unknown as MatchRecord
			if (record.matchCandidates.length === 0) {
				toast.info(t(getKey('noResults')))
				return
			}
			if (record.rawHits > record.matchCandidates.length) {
				toast.warning(t(getKey('partialResults')))
			}
			openReview([record], 0, MergeStrategy.PreferExternal)
			onClose()
		},
		onError: (error) => {
			toast.error(t(getKey('searchFailed')), {
				description: extractErrorMessage(error),
			})
		},
	})

	const onSubmit = (values: SearchFormValues) =>
		mutate({
			id: mediaId,
			search: {
				title: values.title?.trim() || undefined,
				author: values.author?.trim() || undefined,
				isbn: values.isbn?.trim() || undefined,
				year: values.year,
				number: values.number,
				comicVineVolumeId: values.comicVineVolumeId?.trim() || undefined,
				provider: (values.provider as MetadataProvider) || null,
			},
		})

	return (
		<>
			<Form id="book-metadata-search-form" form={form} onSubmit={onSubmit}>
				<div className="space-y-4 flex flex-col">
					{enabledProviders.length === 0 && (
						<Alert variant="info">
							<Info />
							<AlertDescription>{t(getKey('noProviders'))}</AlertDescription>
						</Alert>
					)}

					<Input label={t(getFormKey('title.label'))} {...form.register('title')} fullWidth />
					<Input label={t(getFormKey('author.label'))} {...form.register('author')} fullWidth />
					<Input label={t(getFormKey('isbn.label'))} {...form.register('isbn')} fullWidth />
					<Input
						label={t(getFormKey('year.label'))}
						type="number"
						{...form.register('year')}
						fullWidth
					/>
					<Input
						label={t(getFormKey('number.label'))}
						type="number"
						{...form.register('number')}
						placeholder="e.g., 1, 2.5"
						step="0.01"
						fullWidth
					/>
					<Input
						label={t(getFormKey('comicVineVolumeId.label'))}
						{...form.register('comicVineVolumeId')}
						placeholder={t(getFormKey('comicVineVolumeId.placeholder'))}
						fullWidth
					/>

					<div className="gap-2 flex flex-col">
						<Label>{t(getFormKey('provider.label'))}</Label>
						<NativeSelect
							options={enabledProviders.map((p) => ({
								label: PROVIDER_LABELS[p.providerType] ?? p.providerType,
								value: p.providerType,
							}))}
							emptyOption={{ label: t(getFormKey('provider.allOption')), value: '' }}
							{...form.register('provider')}
							disabled={enabledProviders.length === 0}
						/>
					</div>
				</div>
			</Form>

			<Dialog.Footer>
				<Button variant="outline" onClick={onClose} disabled={isPending}>
					{t('common.cancel')}
				</Button>
				<Button
					type="submit"
					form="book-metadata-search-form"
					disabled={isPending || enabledProviders.length === 0}
					isLoading={isPending}
				>
					{t(getKey('searchButton'))}
				</Button>
			</Dialog.Footer>
		</>
	)
}

const LOCALE_KEY = 'bookManagementScene.metadataSearch'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getFormKey = (key: string) => `${LOCALE_KEY}.form.${key}`

const searchFormSchema = z
	.object({
		title: z.string().nullish(),
		author: z.string().nullish(),
		isbn: z.string().nullish(),
		year: z.coerce.number().int().nullish(),
		number: z.coerce.number().nullish(),
		comicVineVolumeId: z.string().nullish(),
		provider: z.union([z.string(), z.nativeEnum(MetadataProvider)]).nullish(),
	})
	.transform((values) => ({
		...values,
		provider: values.provider ? values.provider : null,
	}))

type SearchFormValues = z.infer<typeof searchFormSchema>
