import { ButtonOrLink } from '@stump/components'
import { UserPermission } from '@stump/graphql'

import { OwlEmptyState } from '@/components/Owl'
import { useTranslate } from '@/hooks/useTranslate'

import { useAppContext } from '../../context'
import { usePaths } from '../../paths'

export function NoLibraries() {
	const paths = usePaths()
	const { t } = useTranslate()
	const { checkPermission } = useAppContext()

	const canCreateLibrary = checkPermission(UserPermission.CreateLibrary)

	return (
		<OwlEmptyState
			title={t(getKey('heading'))}
			description={t(getKey(`message.${canCreateLibrary ? 'create' : 'wait'}`))}
			actions={
				<>
					{canCreateLibrary && (
						<ButtonOrLink href={paths.libraryCreate()} variant="secondary">
							{t(getKey('links.create'))}
						</ButtonOrLink>
					)}

					<ButtonOrLink href={paths.settings()} variant="ghost">
						{t(getKey('links.settings'))}
					</ButtonOrLink>
				</>
			}
		/>
	)
}

const LOCALE_BASE_KEY = 'noLibraries'
const getKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`
