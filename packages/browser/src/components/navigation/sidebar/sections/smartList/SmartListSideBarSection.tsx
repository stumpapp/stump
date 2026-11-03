import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Accordion } from '@stump/components'
import { FilterableArrangementEntityLink, graphql } from '@stump/graphql'
import { ListFilter } from 'lucide-react'
import { useLocation } from 'react-router'

import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'
import { usePrefetchSmartList } from '@/scenes/smartList/graphql'

import { EntityOptionProps } from '../../../types'
import { CollapsedSidebarSection, useIsSidebarIconMode } from '../../CollapsedSidebarItems'
import SideBarButtonLink from '../../SideBarButtonLink'
import { SectionEmptyMessage } from '../SectionEmptyMessage'

const query = graphql(`
	query SmartListSideBarSection {
		smartLists {
			id
			name
		}
	}
`)

type Props = EntityOptionProps

export default function SmartListSideBarSection({
	links = [FilterableArrangementEntityLink.Create],
}: Props) {
	const location = useLocation()
	const paths = usePaths()

	const { t, translate } = useTranslate()
	const { sdk } = useSDK()
	const {
		data: { smartLists: lists },
	} = useSuspenseGraphQL(query, sdk.cacheKey('smartLists'))

	const { prefetch } = usePrefetchSmartList()

	const isCurrentList = (id: string) => location.pathname.startsWith(paths.smartList(id))

	const isIconMode = useIsSidebarIconMode()
	if (isIconMode) {
		return (
			<CollapsedSidebarSection
				label={translate('shared.common.smartLists')}
				icon={ListFilter}
				emptyMessage={t('sidebar.buttons.noSmartlists')}
				items={(lists ?? []).map(({ id, name }) => ({
					key: id,
					label: name,
					to: paths.smartList(id),
					isActive: isCurrentList(id),
					onMouseEnter: () => prefetch({ id }),
				}))}
				actions={[
					...(links.includes(FilterableArrangementEntityLink.ShowAll)
						? [{ key: 'all', label: t('sidebar.buttons.seeAll'), to: paths.smartLists() }]
						: []),
					...(links.includes(FilterableArrangementEntityLink.Create)
						? [
								{
									key: 'create',
									label: t('sidebar.buttons.createSmartlist'),
									to: paths.smartListCreate(),
								},
							]
						: []),
				]}
			/>
		)
	}

	const renderLists = () => {
		if (!lists || !lists.length) {
			return <SectionEmptyMessage message={t('sidebar.buttons.noSmartlists')} />
		}

		return lists.map(({ id, name }) => {
			return (
				<SideBarButtonLink
					key={id}
					to={paths.smartList(id)}
					isActive={isCurrentList(id)}
					className="pl-2 pr-0"
					onMouseEnter={() => prefetch({ id })}
				>
					{name}
				</SideBarButtonLink>
			)
		})
	}

	return (
		<Accordion type="single" collapsible className="py-1 w-full" defaultValue="smartlists">
			<Accordion.Item value="smartlists" className="border-none">
				<Accordion.Trigger
					noUnderline
					asLabel
					className="px-1 py-1 text-sm font-medium tracking-wide text-muted-foreground"
				>
					{translate('shared.common.smartLists')}
				</Accordion.Trigger>
				<Accordion.Content containerClassName="flex flex-col space-y-1.5">
					{links.includes(FilterableArrangementEntityLink.ShowAll) && (
						<SideBarButtonLink
							to={paths.smartLists()}
							isActive={location.pathname === paths.smartLists()}
							variant="action"
						>
							{t('sidebar.buttons.seeAll')}
						</SideBarButtonLink>
					)}
					<div className="space-y-1">{renderLists()}</div>
					{links.includes(FilterableArrangementEntityLink.Create) && (
						<SideBarButtonLink
							to={paths.smartListCreate()}
							isActive={location.pathname === paths.smartListCreate()}
							variant="action"
						>
							{t('sidebar.buttons.createSmartlist')}
						</SideBarButtonLink>
					)}
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
