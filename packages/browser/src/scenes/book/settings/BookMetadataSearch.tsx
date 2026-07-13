import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import {
	Alert,
	AlertDescription,
	Button,
	Dialog,
	Input,
	Label,
	NativeSelect,
} from '@stump/components'
import { extractErrorMessage, graphql, MergeStrategy, MetadataProvider } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Info } from 'lucide-react'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'

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

	const openReview = useMatchReviewStore((s) => s.open)

	const [title, setTitle] = useState(initialTitle)
	const [author, setAuthor] = useState('')
	const [isbn, setIsbn] = useState('')
	const [year, setYear] = useState('')
	const [provider, setProvider] = useState<MetadataProvider | ''>('')

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

	const handleSubmit = () => {
		const parsedYear = parseInt(year, 10)

		mutate({
			id: mediaId,
			search: {
				title: title.trim() || undefined,
				author: author.trim() || undefined,
				isbn: isbn.trim() || undefined,
				year: Number.isNaN(parsedYear) ? undefined : parsedYear,
				provider: provider || undefined,
			},
		})
	}

	return (
		<>
			<div className="space-y-4 flex flex-col">
				{enabledProviders.length === 0 && (
					<Alert variant="info">
						<Info />
						<AlertDescription>{t(getKey('noProviders'))}</AlertDescription>
					</Alert>
				)}

				<Input
					label={t(getFormKey('title.label'))}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					fullWidth
				/>
				<Input
					label={t(getFormKey('author.label'))}
					value={author}
					onChange={(e) => setAuthor(e.target.value)}
					fullWidth
				/>
				<Input
					label={t(getFormKey('isbn.label'))}
					value={isbn}
					onChange={(e) => setIsbn(e.target.value)}
					fullWidth
				/>
				<Input
					label={t(getFormKey('year.label'))}
					type="number"
					value={year}
					onChange={(e) => setYear(e.target.value)}
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
						value={provider}
						onChange={(e) => setProvider(e.target.value as MetadataProvider)}
						disabled={enabledProviders.length === 0}
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onClick={onClose} disabled={isPending}>
					{t('common.cancel')}
				</Button>
				<Button
					onClick={handleSubmit}
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
