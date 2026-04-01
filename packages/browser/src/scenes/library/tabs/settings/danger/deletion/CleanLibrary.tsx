import { useGraphQLMutation } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	ConfirmationModal,
	Heading,
	Text,
} from '@stump/components'
import { graphql, LibraryMissingEntitiesQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useLibraryManagement } from '../../context'
import MisisngEntitiesTable from './MissingEntitiesTable'

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
	const { mutateAsync: cleanLibrary, isPending } = useGraphQLMutation(mutation)

	const [showConfirmation, setShowConfirmation] = useState(false)
	const [isNoneMissingState, setIsNoneMissingState] = useState(false)

	const client = useQueryClient()

	useEffect(() => {
		const unsubscribe = client.getQueryCache().subscribe(({ query: { queryKey } }) => {
			const [baseKey, libraryID] = queryKey
			if (baseKey === 'missingEntities' && libraryID === id) {
				const data = client.getQueryData<LibraryMissingEntitiesQuery>(queryKey)
				const entities = data?.libraryMissingEntities.nodes ?? []
				setIsNoneMissingState(entities.length === 0)
			}
		})

		return () => {
			unsubscribe()
		}
	}, [id, client])

	const handleClean = async () => {
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
	}

	return (
		<div className="flex flex-col space-y-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">{t(getKey('heading'))}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t(getKey('description'))}
					</Text>
				</div>

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
								disabled={isNoneMissingState || isPending}
								isLoading={isPending}
								variant="danger"
							>
								{t(getKey('confirmation.label'))}
							</Button>
						</div>
					}
				/>
			</div>

			<Alert variant="info" id="clean-library-info" dismissible>
				<Info />
				<AlertTitle>{t(getKey('disclaimerTitle'))}</AlertTitle>
				<AlertDescription>{t(getKey('disclaimer'))}</AlertDescription>
			</Alert>

			<Suspense>
				<MisisngEntitiesTable />
			</Suspense>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/delete.sections.cleanLibrary'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
