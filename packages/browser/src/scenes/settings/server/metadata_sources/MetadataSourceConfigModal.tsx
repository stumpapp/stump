import { useMetadataSourceConfigQuery, useSDK } from '@stump/client'
import { Button, Dialog } from '@stump/components'
import { MetadataSourceEntry } from '@stump/sdk'
import { useMemo, useState } from 'react'

import MetadataSourceConfigField from './MetadataSourceConfigField'

type Props = {
	isOpen: boolean
	onClose: () => void
	source?: MetadataSourceEntry | null
}

export default function MetadataSourceConfigModal({ isOpen, onClose, source }: Props) {
	// const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { config_schema } = useMetadataSourceConfigQuery(source?.name ?? '')

	const initialFormData = useMemo(() => {
		if (!source?.config) {
			return {}
		}
		try {
			return JSON.parse(source.config) as Record<string, string | number>
		} catch (err) {
			console.error('Failed to parse source config', err)
			return {}
		}
	}, [source?.config])

	const [formData, setFormData] = useState<Record<string, string | number>>(initialFormData)

	const onOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			onClose()
		}
	}

	const handleApply = async () => {
		if (!source) {
			return
		}

		try {
			const updatedSource: MetadataSourceEntry = {
				...source,
				config: JSON.stringify(formData), // serialize form data to JSON because that's what the DB holds
			}

			await sdk.metadata_sources.put(updatedSource)

			onClose()
		} catch {
			//TODO - Consider toasting with an error here
		}
	}

	const handleFieldChange = (key: string, value: string | number) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>
						{source ? `Configuration for: ${source.name}` : 'No source selected'}
					</Dialog.Title>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				<div className="flex flex-col gap-y-2 py-2 scrollbar-hide">
					{config_schema?.fields?.map((field) => (
						<MetadataSourceConfigField
							key={field.key}
							field={field}
							value={formData[field.key]}
							onChange={(val) => handleFieldChange(field.key, val)}
						/>
					))}
				</div>

				<Dialog.Footer>
					<Button onClick={handleApply} variant="primary">
						Apply
					</Button>
					<Button variant="default" onClick={onClose}>
						Close
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
