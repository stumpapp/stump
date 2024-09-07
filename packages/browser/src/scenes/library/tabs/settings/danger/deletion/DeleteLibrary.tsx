import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useState } from 'react'

import DeleteLibraryConfirmation from '@/components/library/DeleteLibraryConfirmation'

import { useLibraryManagement } from '../../context'

export default function DeleteLibrary() {
	const {
		library: { id },
	} = useLibraryManagement()
	const { t } = useLocaleContext()

	const [showConfirmation, setShowConfirmation] = useState(false)

	return (
		<div className="flex flex-col space-y-4">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description.0'))} <b>{t(getKey('description.1'))}</b>
				</Text>
			</div>

			<DeleteLibraryConfirmation
				isOpen={showConfirmation}
				libraryId={id}
				onClose={() => setShowConfirmation(false)}
				trigger={
					<div>
						<Button
							type="button"
							variant="danger"
							onClick={() => setShowConfirmation(true)}
							className="flex-shrink-0"
							size="md"
						>
							Delete library
						</Button>
					</div>
				}
			/>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/delete.sections.deleteLibrary'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
