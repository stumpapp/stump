import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'
import { Helmet } from 'react-helmet'

import { Container, ContentContainer } from '@/components/container'

import PreloadPagesSection from './PreloadPagesSection'

export default function ReaderDefaultSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<Container>
			<Helmet>
				<title>Stump | {t('settingsScene.app/reader.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-y-8">
					<div>
						<Heading size="sm">{t(getSectionKey('imageBasedBooks.label'))}</Heading>
						<Text variant="muted" size="sm">
							{t(getSectionKey('imageBasedBooks.description'))}
						</Text>
					</div>

					<PreloadPagesSection />
				</div>
			</ContentContainer>
		</Container>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
const getSectionKey = (key: string) => getKey(`sections.${key}`)
