import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useState } from 'react'

import { useSmartListSettings } from '../context'
import DeleteListConfirmation from './DeleteListConfirmation'

export default function DangerSettingsScene() {
	const {
		list: { id },
	} = useSmartListSettings()
	const { t } = useLocaleContext()

	const [showConfirmation, setShowConfirmation] = useState(false)

	return (
		<div className="flex flex-col gap-12">
			<div className="flex flex-col space-y-4">
				<div>
					<Heading size="sm">{t(getKey('heading'))}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t(getKey('description.0'))} <b>{t(getKey('description.1'))}</b>
					</Text>
				</div>

				<DeleteListConfirmation
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
							>
								Delete list
							</Button>
						</div>
					}
				/>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'smartListSettingsScene.danger-zone/delete.sections.deleteList'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
