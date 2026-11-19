import { useGraphQLMutation, useOidcConfig, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { graphql, LibraryLayoutQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { OidcGroupsTable } from '@/components/library/accessControl'
import { useLibraryContext } from '@/components/library/context'
import { useTranslate } from '@/hooks/useTranslate'

const mutation = graphql(`
	mutation UpdateLibraryOidcGroups($id: ID!, $oidcGroups: [String!]!) {
		updateLibraryOidcGroups(id: $id, oidcGroups: $oidcGroups) {
			id
			oidcGroups
		}
	}
`)

export function LibraryOidcGroups() {
	const { t } = useTranslate()
	const { library } = useLibraryContext()
	const { sdk } = useSDK()
	const oidcConfig = useOidcConfig()
	const client = useQueryClient()

	const [pending, setPending] = useState<string[] | null>(null)

	const { mutate, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLibraryOidcGroups: { oidcGroups } }) => {
			setPending(null)
			client.setQueryData<LibraryLayoutQuery>(sdk.cacheKey('libraryById', [library.id]), (prev) =>
				prev?.libraryById ? { libraryById: { ...prev.libraryById, oidcGroups } } : prev,
			)
		},
	})

	if (!oidcConfig.enabled) return null

	const groups = library.oidcGroups || []

	return (
		<>
			<OidcGroupsTable
				groups={groups}
				onChange={(nextGroups) => setPending(nextGroups)}
				disabled={isPending}
				alertId={`oidc-groups-info-${library.id}`}
			/>

			<ConfirmationModal
				title={t(getKey('confirmationModal.title'))}
				description={t(getKey('confirmationModal.description'))}
				isOpen={!!pending}
				onClose={() => setPending(null)}
				onConfirm={() => pending != null && mutate({ id: library.id, oidcGroups: pending })}
				confirmDisabled={isPending}
			/>
		</>
	)
}

const getKey = (key: string) =>
	`librarySettingsScene.danger-zone/access-control.sections.oidcGroups.${key}`
