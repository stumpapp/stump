import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useState } from 'react'

type Props = {
	onConfirmReset: () => void
}

export default function ResetConfiguredServersSection({ onConfirmReset }: Props) {
	const { t } = useLocaleContext()

	const [showConfirmation, setShowConfirmation] = useState(false)

	return (
		<div className="flex flex-col space-y-4">
			<div>
				<Heading size="xs">{t(getKey('label'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description.0'))}. <b>{t(getKey('description.1'))}</b>
				</Text>
			</div>

			{/* TODO: confirmation modal */}
			<div>
				<Button
					type="button"
					variant="danger"
					onClick={onConfirmReset}
					className="flex-shrink-0"
					size="md"
				>
					{t(getKey('confirmation.trigger'))}
				</Button>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.resetConfiguration'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
