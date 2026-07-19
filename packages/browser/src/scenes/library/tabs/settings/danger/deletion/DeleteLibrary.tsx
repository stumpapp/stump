import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useState } from 'react'

import DeleteLibraryConfirmation from '@/components/library/DeleteLibraryConfirmation'

import { useLibraryManagement } from '../../context'

export default function DeleteLibrary() {
	const {
		library: { id, name },
	} = useLibraryManagement()
	const { t } = useLocaleContext()

	const [showConfirmation, setShowConfirmation] = useState(false)

	return (
		<div className="space-y-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description.0'))} <b>{t(getKey('description.1'))}</b>
				</Text>
			</div>

			<DeleteLibraryConfirmation
				isOpen={showConfirmation}
				libraryId={id}
				libraryName={name}
				onClose={() => setShowConfirmation(false)}
				trigger={
					<div>
						<Button
							type="button"
							variant="destructive"
							onClick={() => setShowConfirmation(true)}
							className="shrink-0"
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
