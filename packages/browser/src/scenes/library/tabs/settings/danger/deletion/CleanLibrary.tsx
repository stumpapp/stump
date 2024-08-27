import { libraryApi } from '@stump/api'
import { Alert, Button, ConfirmationModal, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'

import { useLibraryManagement } from '../../context'

export default function CleanLibrary() {
	const {
		library: { id },
	} = useLibraryManagement()
	const { t } = useLocaleContext()

	const [justCleaned, setJustCleaned] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)
	const [isCleaning, setIsCleaning] = useState(false)

	const handleDeleteThumbnails = async () => {
		try {
			setIsCleaning(true)
			const { data } = await libraryApi.cleanLibrary(id)
			setJustCleaned(true)
			toast.success(
				`Cleaned ${data.deleted_media_count} media and ${data.deleted_series_count} series`,
			)
			if (data.is_empty) {
				toast('The library is now empty')
			}
			setShowConfirmation(false)
		} catch (error) {
			console.error(error)
			const fallbackMessage = 'An error occurred while cleaning the library'
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		} finally {
			setIsCleaning(false)
		}
	}

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
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isCleaning}
				trigger={
					<div>
						<Button
							type="button"
							onClick={() => setShowConfirmation(true)}
							className="flex-shrink-0"
							size="md"
							disabled={justCleaned || isCleaning}
							isLoading={isCleaning}
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
