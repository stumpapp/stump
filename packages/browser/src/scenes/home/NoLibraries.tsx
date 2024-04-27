import { ButtonOrLink, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useAppContext } from '../../context'
import paths from '../../paths'

export default function NoLibraries() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canCreateLibrary = checkPermission('library:create')

	return (
		<div className="flex flex-1 flex-col items-center justify-center">
			<img
				src="/assets/svg/mountain.svg"
				alt="Construction illustration"
				className="mx-auto h-72 w-1/2 shrink-0 object-scale-down sm:h-96"
			/>

			<div className="mx-auto flex max-w-lg flex-col space-y-2 text-center">
				<Heading className="text-3xl font-extrabold md:text-4xl">{t(getKey('heading'))}</Heading>
				<Text size="lg">
					{t(getKey('messagePrefix'))}.{' '}
					{t(getKey(`message.${canCreateLibrary ? 'create' : 'wait'}`))}
				</Text>

				{canCreateLibrary && (
					<div className="flex items-center justify-center space-x-2">
						<ButtonOrLink href={paths.libraryCreate()} variant="primary" className="mt-4">
							{t(getKey('links.create'))}
						</ButtonOrLink>
					</div>
				)}
			</div>
		</div>
	)
}

const LOCALE_BASE_KEY = 'noLibraries'
const getKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`
