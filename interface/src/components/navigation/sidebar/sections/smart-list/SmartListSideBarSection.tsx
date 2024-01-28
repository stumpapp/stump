import { useSmartListsQuery } from '@stump/client'
import { Accordion, Text } from '@stump/components'
import { useLocation } from 'react-router'

import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

import SideBarButtonLink from '../../SideBarButtonLink'

export default function SmartListSideBarSection() {
	const location = useLocation()

	const { t } = useLocaleContext()
	const { lists } = useSmartListsQuery()

	const isCurrentList = (id: string) => location.pathname.startsWith(paths.smartList(id))

	const renderLists = () => {
		if (!lists || !lists.length) {
			return (
				<Text className="select-none px-1 py-2" variant="muted">
					{t('sidebar.buttons.noSmartlists')}
				</Text>
			)
		}

		return lists.map(({ id, name }) => {
			return (
				<SideBarButtonLink
					key={id}
					to={paths.smartList(id)}
					isActive={isCurrentList(id)}
					className="pl-2 pr-0"
				>
					{name}
				</SideBarButtonLink>
			)
		})
	}

	return (
		<Accordion type="single" collapsible className="w-full" defaultValue="smartlists">
			<Accordion.Item value="smartlists" className="border-none">
				<Accordion.Trigger noUnderline asLabel className="px-1 py-0 pb-2">
					{t('sidebar.buttons.smartlists')}
				</Accordion.Trigger>
				<Accordion.Content containerClassName="flex flex-col gap-y-1.5">
					{renderLists()}
					<SideBarButtonLink
						to={paths.smartListCreate()}
						isActive={location.pathname === paths.smartListCreate()}
						variant="action"
					>
						{t('sidebar.buttons.createSmartlist')}
					</SideBarButtonLink>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
