import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useState } from 'react'

import DeleteBookClubConfirmation from '@/components/bookClub/DeleteBookClubConfirmation'

import { useBookClubManagement } from '../context'

export default function DeleteBookClubSection() {
	const {
		club: { id },
	} = useBookClubManagement()
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

			<DeleteBookClubConfirmation
				isOpen={showConfirmation}
				id={id}
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
							{t(getKey('trigger'))}
						</Button>
					</div>
				}
			/>
		</div>
	)
}

const LOCALE_KEY = 'bookClubSettingsScene.danger-zone/delete.sections.deleteClub'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
