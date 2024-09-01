import { libraryApi } from '@stump/api'
import { Alert, Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useCallback } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

export default function AnalyzeMedia() {
	const { library } = useLibraryContext()
	const { t } = useLocaleContext()

	const handleAnalyze = useCallback(() => libraryApi.startMediaAnalysis(library.id), [library.id])

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<Alert level="info" icon="info">
				<Alert.Content>{t(getKey('disclaimer'))}</Alert.Content>
			</Alert>

			<div>
				<Button size="md" variant="primary" onClick={handleAnalyze}>
					Analyze books
				</Button>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.options/analysis.sections.analyzeBooks'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
