import { useGraphQLMutation } from '@stump/client'
import { Alert, Button, ConfirmationModal, Heading, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useLibraryManagement } from '../../context'

// TODO: add query for whether a clean would do anything to disable this section

const mutation = graphql(`
	mutation CleanLibrary($id: ID!) {
		cleanLibrary(id: $id) {
			deletedMediaCount
			deletedSeriesCount
			isEmpty
		}
	}
`)

export default function CleanLibrary() {
	const {
		library: { id },
	} = useLibraryManagement()
	const { t } = useLocaleContext()

	const { mutateAsync: cleanLibrary, isPending, data } = useGraphQLMutation(mutation)

	const [showConfirmation, setShowConfirmation] = useState(false)

	const handleClean = useCallback(async () => {
		try {
			toast.promise(cleanLibrary({ id }), {
				loading: t(getKey('confirmation.loading')),
				success: ({ cleanLibrary: result }) => {
					if (result.isEmpty) {
						return t(getKey('emptyText'))
					} else if (result.deletedMediaCount === 0 && result.deletedSeriesCount === 0) {
						return t(getKey('confirmation.nothingToDelete'))
					} else {
						return `Cleaned ${result.deletedMediaCount} media and ${result.deletedSeriesCount} series`
					}
				},
				error: (error) => {
					const fallbackMessage = t(getKey('confirmation.error'))
					if (error instanceof Error) {
						return error.message || fallbackMessage
					}
					return fallbackMessage
				},
			})
			setShowConfirmation(false)
		} catch (error) {
			console.error(error)
			const fallbackMessage = 'An error occurred while cleaning the library'
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		}
	}, [cleanLibrary, id, t])

	return (
		<div className="flex flex-col space-y-4">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			<Alert level="info" icon="warning">
				<Alert.Content>{t(getKey('disclaimer'))}</Alert.Content>
			</Alert>

			<ConfirmationModal
				title={t(getKey('confirmation.label'))}
				description={t(getKey('confirmation.text'))}
				confirmText={t(getKey('confirmation.label'))}
				confirmVariant="danger"
				isOpen={showConfirmation}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleClean}
				confirmIsLoading={isPending}
				trigger={
					<div>
						<Button
							type="button"
							onClick={() => setShowConfirmation(true)}
							className="flex-shrink-0"
							size="md"
							disabled={!!data || isPending}
							isLoading={isPending}
							variant="danger"
						>
							{t(getKey('confirmation.label'))}
						</Button>
					</div>
				}
			/>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/delete.sections.cleanLibrary'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
