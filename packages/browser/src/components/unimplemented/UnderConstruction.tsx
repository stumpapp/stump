import { ButtonOrLink, Heading, Text } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import { SceneContainer } from '../container'
import { Owl } from '../Owl'

type Props = {
	issue?: number
}
export default function UnderConstruction({ issue }: Props) {
	const paths = usePaths()
	const { t } = useTranslate()

	return (
		<SceneContainer className="gap-2 h-full w-full flex-1 items-center justify-center">
			<Owl owl="construction" className="mx-auto" />

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
					<ButtonOrLink href={paths.home()} className="mt-4">
						{t(getKey('homeLink'))}
					</ButtonOrLink>
				</div>
			</div>
		</SceneContainer>
	)
}

const LOCALE_BASE_KEY = 'underConstruction'
const getKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`
