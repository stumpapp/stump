import { ButtonOrLink, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import paths from '@/paths'

import { SceneContainer } from '../container'

type Props = {
	issue?: number
}
export default function UnderConstruction({ issue }: Props) {
	const { t } = useLocaleContext()

	return (
		<SceneContainer className="h-full w-full flex-1">
			<img
				src="/assets/svg/construction-site.svg"
				alt="Construction illustration"
				className="mx-auto h-72 w-1/2 shrink-0 object-scale-down sm:h-96"
			/>

			<div className="mx-auto flex max-w-lg flex-col space-y-2 text-center">
				<Heading className="text-3xl font-extrabold md:text-4xl">{t(getKey('heading'))}</Heading>
				<Text size="lg">{t(getKey('message'))}</Text>

				<div className="flex items-center justify-center space-x-2">
					{issue && (
						<ButtonOrLink
							href={`https://github.com/stumpapp/stump/issues/${issue}`}
							variant="secondary"
							className="mt-4"
							target="_blank"
							rel="noopener noreferrer"
						>
							{t(getKey('githubLink'))}
						</ButtonOrLink>
					)}
					<ButtonOrLink href={paths.home()} variant="primary" className="mt-4">
						{t(getKey('homeLink'))}
					</ButtonOrLink>
				</div>
			</div>
		</SceneContainer>
	)
}

const LOCALE_BASE_KEY = 'underConstruction'
const getKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`
