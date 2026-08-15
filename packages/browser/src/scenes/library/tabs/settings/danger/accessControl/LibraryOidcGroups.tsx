import { useGraphQLMutation, useOidcConfig } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	ComboBox,
	ConfirmationModal,
	Heading,
	Text,
} from '@stump/components'
import { graphql, LibraryLayoutQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

const mutation = graphql(`
	mutation UpdateLibraryOidcGroups($id: ID!, $oidcGroups: [String!]!) {
		updateLibraryOidcGroups(id: $id, oidcGroups: $oidcGroups) {
			id
			oidcGroups
		}
	}
`)

export function LibraryOidcGroups() {
	const { t } = useLocaleContext()
	const { library } = useLibraryContext()

	const oidcConfig = useOidcConfig()

	const [groupOptions, setGroupOptions] = useState(
		(library?.oidcGroups || []).map((group) => ({ label: group, value: group })),
	)
	const [selection, setSelection] = useState(library.oidcGroups || [])
	const [showConfirmationModal, setShowConfirmationModal] = useState(false)

	const client = useQueryClient()

	const { mutate, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLibraryOidcGroups: { oidcGroups } }) => {
			setShowConfirmationModal(false)
			const libraryById = client.getQueryData<LibraryLayoutQuery>([
				'libraryById',
				[library.id],
			])?.libraryById
			if (!libraryById) return
			client.setQueryData(['libraryAccess', library.id], {
				libraryById: {
					...libraryById,
					oidcGroups,
				},
			})
		},
	})

	const onSaveChanges = () => mutate({ id: library.id, oidcGroups: selection })

	if (!oidcConfig.enabled) return null

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			<Alert variant="info" dismissible id={`oidc-groups-info-${library.id}`}>
				<AlertCircle />
				<AlertTitle>{t(getKey('disclaimer.title'))}</AlertTitle>
				<AlertDescription>{t(getKey('disclaimer.description'))}</AlertDescription>
			</Alert>

			<ComboBox
				options={groupOptions}
				value={selection}
				isMultiSelect
				onChange={(value) => setSelection(value ?? [])}
				onAddOption={(option) => setGroupOptions((prev) => [...prev, option])}
				filterable
			/>

			<div>
				<Button onClick={() => setShowConfirmationModal(true)}>{t('common.saveChanges')}</Button>
			</div>

			<ConfirmationModal
				title={t(getKey('confirmationModal.title'))}
				description={t(getKey('confirmationModal.description'))}
				isOpen={showConfirmationModal}
				onClose={() => setShowConfirmationModal(false)}
				onConfirm={onSaveChanges}
				confirmDisabled={isPending}
			/>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/access-control.sections.oidcGroups'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
