import { ButtonOrLink, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

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
				className="h-72 sm:h-96 mx-auto w-1/2 shrink-0 object-scale-down"
			/>

			<div className="max-w-lg space-y-2 mx-auto flex flex-col text-center">
				<Heading className="text-3xl font-extrabold md:text-4xl">{t(getKey('heading'))}</Heading>
				<Text size="lg">{t(getKey('message'))}</Text>

				<div className="space-x-2 flex items-center justify-center">
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
