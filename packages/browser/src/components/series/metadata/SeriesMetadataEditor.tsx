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
	MetadataEditorContext,
	MetadataEditorHeader,
	MetadataEditorState,
	MetadataEditorTable,
	NumberCell,
	SeriesMetadataEditorRow,
	SeriesMetadataKeys,
	TextCell,
} from '@/components/metadataEditor'
import EnumCell from '@/components/metadataEditor/cells/EnumCell'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

import {
	getEditorDefaultValues,
	schema,
	SeriesMetadataEditorValues,
	SeriesStatus,
	VALID_SERIES_STATUS,
} from './schema'

const fragment = graphql(`
	fragment SeriesMetadataEditor on SeriesMetadata {
		ageRating
		booktype
		characters
		comicid
		genres
		imprint
		links
		metaType
		publisher
		status
		summary
		title
		volume
		writers
	}
`)

const mutation = graphql(`
	mutation UpdateSeriesMetadata($id: ID!, $input: SeriesMetadataInput!) {
		updateSeriesMetadata(id: $id, input: $input) {
			metadata {
				...SeriesMetadataEditor
			}
		}
	}
`)

type Props = {
	seriesId: string
	data?: FragmentType<typeof fragment> | null
}

// TODO(ux): Improve error states within form

export default function SeriesMetadataEditor({ seriesId, data }: Props) {
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
				header: () => null,
				cell: (info) =>
					match(info.getValue())
						.with(P.union('ageRating', 'volume', 'comicid'), (field) => (
							<NumberCell binding={field} value={metadata?.[field]} />
						))
						.with('publisher', () => (
							<BadgeCell
								binding="publisher"
								value={metadata?.publisher || null}
								itemUrl={() => {
									if (metadata?.publisher == null) return undefined
									return paths.bookSearchWithFilter({
										metadata: { publisher: { likeAnyOf: [metadata.publisher] } },
									})
								}}
							/>
						))
						.with(P.union('genres', 'characters', 'writers'), (field) => {
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
						})
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
						.with('status', () => (
							<EnumCell
								binding="status"
								value={metadata?.status as SeriesStatus}
								// TODO: Translation support
								options={VALID_SERIES_STATUS.map((status) => ({ label: status, value: status }))}
							/>
						))
						.otherwise((field) => (
							<TextCell
								binding={field}
								value={String(getProperty(metadata, info.getValue()) ?? '')}
								isLong={field === 'summary'}
							/>
						)),
				enableResizing: false,
				meta: {
					isGrow: true,
				},
			}),
			columnHelper.display({
				id: 'actions',
				header: () =>
					checkPermission(UserPermission.EditMetadata) ? <MetadataEditorHeader /> : null,
				cell: () => null,
			}),
		],
		[metadata, paths, checkPermission],
	) as ColumnDef<SeriesMetadataEditorRow>[]

	const items = useMemo(
		() =>
			SeriesMetadataKeys.map((key) => ({
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
			queryKey: sdk.cacheKey('seriesById', [seriesId, 'settings']),
		})
	}, [client, sdk, seriesId])

	const { mutate: updateMetadata } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateSeriesMetadata: { metadata } }) => {
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
		(values: SeriesMetadataEditorValues) => {
			if (seriesId) {
				updateMetadata({
					id: seriesId,
					input: values,
				})
			}
		},
		[seriesId, updateMetadata],
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
				<form onSubmit={form.handleSubmit(onSaveMetadata)}>
					<MetadataEditorTable<SeriesMetadataEditorRow>
						columns={columns}
						items={items}
						showMissing={showMissing}
					/>
				</form>
			</MetadataEditorContext.Provider>
		</FormProvider>
	)
}

const columnHelper = createColumnHelper<SeriesMetadataEditorRow>()

const LOCALE_BASE = `metadataEditor`
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getLabelKey = (binding: string) => getKey(`labels.${binding}`)
