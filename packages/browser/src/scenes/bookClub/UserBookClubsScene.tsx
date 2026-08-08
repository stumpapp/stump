import { useSuspenseGraphQL } from '@stump/client'
import { ButtonOrLink, Card, cx, Heading, Text } from '@stump/components'
import { graphql, UserBookClubsSceneQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import paths from '@/paths'

// TODO(book-clubs): This query needs a complete rewrite
const query = graphql(`
	query UserBookClubsScene {
		bookClubs(all: false) {
			id
			name
			slug
			description
			membersCount
			currentBook {
				id
			}
		}
	}
`)

type Club = UserBookClubsSceneQuery['bookClubs'][number]

// TODO: redesign this, absolute yucky poopy
/**
 * A scene that displays all the book clubs the user is a member of
 */
export default function UserBookClubsScene() {
	const { t } = useLocaleContext()
	const {
		data: { bookClubs },
	} = useSuspenseGraphQL(query, ['bookClubs'])

	const renderBookClub = (bookClub: Club) => {
		const isActive = !!bookClub.currentBook

		return (
			<>
				<div className="min-w-0">
					<div className="gap-x-3 flex items-start">
						<Text size="sm" className="font-semibold leading-6">
							{bookClub.name}
						</Text>
						<p
							className={cx(
								{ 'bg-yellow-50 text-yellow-800 ring-yellow-600/20': !isActive },
								'mt-0.5 px-1.5 py-0.5 text-xs font-medium rounded-md whitespace-nowrap ring-1 ring-inset',
							)}
						>
							{isActive
								? t('bookClubUi.clubList.status.active')
								: t('bookClubUi.clubList.status.inactive')}
						</p>
					</div>
					<div className="mt-1 gap-x-2 text-xs leading-5 flex items-center text-gray-500">
						<Text className="whitespace-nowrap">{bookClub.description}</Text>
						<svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
							<circle cx={1} cy={1} r={1} />
						</svg>
						<p className="truncate">
							{t('bookClubUi.clubList.memberCount', { count: bookClub.membersCount })}
						</p>
					</div>
				</div>
				<div className="gap-x-4 flex flex-none items-center">
					<ButtonOrLink href={paths.bookClub(bookClub.slug)} variant="secondary">
						{t('bookClubUi.clubList.actions.goToClub')}
					</ButtonOrLink>
				</div>
			</>
		)
	}

	const renderContent = () => {
		if (!bookClubs?.length) {
			return (
				<Card className="p-6 flex items-center justify-center border-dashed">
					<div className="gap-3 flex flex-col items-center">
						{!bookClubs?.length && (
							<Heading size="xs">{t('bookClubUi.clubList.empty.title')}</Heading>
						)}
						<ButtonOrLink href="explore" variant="secondary">
							{t('bookClubUi.clubList.empty.explorePublic')}
						</ButtonOrLink>
					</div>
				</Card>
			)
		}

		return (
			<>
				<Heading>{t('bookClubUi.clubList.yourClubs')}</Heading>
				<ul role="list" className="divide-y divide-gray-100">
					{bookClubs?.map((club) => (
						<li
							key={club.id}
							className="gap-x-6 px-4 py-5 sm:px-6 lg:px-8 relative flex justify-between hover:bg-gray-50 dark:hover:bg-gray-900"
						>
							{renderBookClub(club)}
						</li>
					))}
				</ul>
			</>
		)
	}

	return (
		<SceneContainer
			className={cx({ 'flex h-full items-center justify-center': !bookClubs?.length })}
		>
			<Helmet>
				<title>Stump | {t('bookClubUi.clubList.pageTitle')}</title>
			</Helmet>

			{renderContent()}
		</SceneContainer>
	)
}
