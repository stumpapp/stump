import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSDK } from '@stump/client'
import { CheckBox, Label, Text } from '@stump/components'
import { FragmentType, graphql, useFragment, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import getProperty from 'lodash/get'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { match, P } from 'ts-pattern'

import {
	BadgeCell,
	BadgeListCell,
	isEmptyField,
	MediaMetadataEditorRow,
	MediaMetadataKeys,
	MetadataEditorContext,
	MetadataEditorHeader,
	MetadataEditorState,
	MetadataEditorTable,
	NumberCell,
	TextCell,
} from '@/components/metadataEditor'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

import { getEditorDefaultValues, MetadataEditorValues, schema } from './schema'

const fragment = graphql(`
	fragment MetadataEditor on MediaMetadata {
		ageRating
		characters
		colorists
		coverArtists
		day
		editors
		genres
		inkers
		letterers
		links
		month
		notes
		number
		pageCount
		pencillers
		publisher
		series
		summary
		teams
		title
		volume
		writers
		year

		mediaId
	}
`)

const mutation = graphql(`
	mutation UpdateMediaMetadata($id: ID!, $input: MediaMetadataInput!) {
		updateMediaMetadata(id: $id, input: $input) {
			metadata {
				...MetadataEditor
			}
		}
	}
`)

type Props = {
	data?: FragmentType<typeof fragment> | null
}

export default function MediaMetadataEditor({ data }: Props) {
	const [_data, setData] = useState(() => data)

	const metadata = useFragment(fragment, _data)
	const paths = usePaths()

	const [showMissing, setShowMissing] = useState(false)

	const [state, setState] = useState<MetadataEditorState>(MetadataEditorState.Display)

	const { checkPermission } = useAppContext()
	const { t } = useLocaleContext()

	const columns = useMemo(
		() => [
			columnHelper.accessor('label', {
				header: ({ table }) => (
					<div className="flex h-full items-center pl-4 font-bold leading-6 text-foreground/90">
						<Label className="flex items-center">
							<CheckBox
								variant="primary"
								checked={table.getIsSomeRowsExpanded()}
								onClick={() => setShowMissing((prev) => !prev)}
							/>

							<span className="ml-2">Missing</span>
						</Label>
					</div>
				),
				cell: (info) => (
					<Text variant="muted" className="text-sm font-medium">
						{info.getValue()}
					</Text>
				),
				enableResizing: true,
			}),
			columnHelper.accessor('field', {
				header: () =>
					checkPermission(UserPermission.EditMetadata) ? <MetadataEditorHeader /> : null,
				cell: (info) =>
					match(info.getValue())
						.with(
							P.union(
								'genres',
								'characters',
								'colorists',
								'coverArtists',
								'editors',
								'inkers',
								'letterers',
								'pencillers',
								'teams',
								'writers',
							),
							(field) => {
								const values = getProperty(metadata, field) ?? []
								return (
									<BadgeListCell
										binding={field}
										values={values}
										itemUrl={(index) => {
											const item = values[index]
											if (!item) return undefined
											return paths.bookSearchWithFilter({
												metadata: { [field]: { likeAnyOf: [item] } },
											})
										}}
									/>
								)
							},
						)
						.with('links', () => {
							const safeUrls = (getProperty(metadata, 'links') ?? []).map((url) => {
								try {
									return new URL(url).hostname
								} catch {
									return url
								}
							})
							return (
								<BadgeListCell
									binding="links"
									values={safeUrls}
									itemUrl={(index) => metadata?.links?.[index]}
								/>
							)
						})
						.with(P.union('summary', 'notes'), (field) => (
							<TextCell binding={field} value={metadata?.[field]} isLong />
						))
						// TODO: Consider breaking out ageRating
						.with(
							P.union('ageRating', 'day', 'month', 'number', 'pageCount', 'volume', 'year'),
							(field) => <NumberCell binding={field} value={metadata?.[field]} />,
						)
						.with('publisher', () => (
							<BadgeCell
								binding="publisher"
								value={metadata?.publisher}
								itemUrl={() => {
									if (metadata?.publisher == null) return undefined
									return paths.bookSearchWithFilter({
										metadata: { publisher: { likeAnyOf: [metadata.publisher] } },
									})
								}}
							/>
						))
						.otherwise((field) => (
							<TextCell binding={field} value={getProperty(metadata, info.getValue())} />
						)),
				enableResizing: false,
				meta: {
					isGrow: true,
				},
			}),
		],
		[metadata, paths, checkPermission],
	) as ColumnDef<MediaMetadataEditorRow>[]

	const items = useMemo(
		() =>
			MediaMetadataKeys.map((key) => ({
				label: t(getLabelKey(key)),
				field: key,
			})).filter(({ field }) => showMissing || !isEmptyField(metadata?.[field])),
		[metadata, showMissing, t],
	)

	const form = useForm({
		defaultValues: getEditorDefaultValues(metadata),
		resolver: zodResolver(schema),
	})

	const client = useQueryClient()
	const { sdk } = useSDK()

	const onRefetchParents = useCallback(() => {
		client.refetchQueries({
			queryKey: sdk.cacheKey('bookOverview', [metadata?.mediaId]),
		})
	}, [client, sdk, metadata])

	const { mutate: updateMetadata } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateMediaMetadata: { metadata } }) => {
			if (metadata) {
				setData(metadata)
			}
			setState(MetadataEditorState.Display)
			onRefetchParents()
		},
		onError: (error) => {
			console.error('Failed to update metadata', error)
			toast.error('Failed to update metadata')
		},
	})

	const onSaveMetadata = useCallback(
		(values: MetadataEditorValues) => {
			if (metadata?.mediaId) {
				updateMetadata({
					id: metadata.mediaId,
					input: values,
				})
			}
		},
		[metadata, updateMetadata],
	)

	const onCancelEdits = useCallback(() => {
		setState(MetadataEditorState.Display)
		form.reset(getEditorDefaultValues(metadata))
	}, [form, metadata])

	return (
		<FormProvider {...form}>
			<MetadataEditorContext.Provider
				value={{
					state,
					setState,
					onCancel: onCancelEdits,
					onSave: () => form.handleSubmit(onSaveMetadata),
				}}
			>
				<MetadataEditorTable<MediaMetadataEditorRow>
					columns={columns}
					items={items}
					showMissing={showMissing}
				/>
			</MetadataEditorContext.Provider>
		</FormProvider>
	)
}

const columnHelper = createColumnHelper<MediaMetadataEditorRow>()

const LOCALE_BASE = `metadataEditor`
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getLabelKey = (binding: string) => getKey(`labels.${binding}`)
