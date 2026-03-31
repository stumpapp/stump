import { ButtonOrLink, Heading, Text } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { useAppContext } from '../../context'
import paths from '../../paths'

export default function NoLibraries() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canCreateLibrary = checkPermission(UserPermission.CreateLibrary)

	return (
		<div className="flex flex-1 flex-col items-center justify-center">
			<div>
				<img
					src="/assets/svg/mountain.svg"
					alt="Construction illustration"
					className="sm:-my-1 sm:w-1/2 sm:px-2 mx-auto h-auto w-3/5 object-scale-down"
				/>

				<div className="max-w-lg space-y-1.5 mx-auto flex shrink-0 flex-col text-center">
					<Heading className="text-2xl font-bold md:text-3xl">{t(getKey('heading'))}</Heading>
					<Text className="text-base sm:text-lg">
						{t(getKey(`message.${canCreateLibrary ? 'create' : 'wait'}`))}
					</Text>

					<div className="space-x-2 pt-3 flex items-center justify-center">
						{canCreateLibrary && (
							<ButtonOrLink href={paths.libraryCreate()} variant="secondary">
								{t(getKey('links.create'))}
							</ButtonOrLink>
						)}

						<ButtonOrLink href={paths.settings()} variant="ghost">
							{t(getKey('links.settings'))}
						</ButtonOrLink>
					</div>
				</div>
			</div>
		</div>
	)
}

const LOCALE_BASE_KEY = 'noLibraries'
const getKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`
