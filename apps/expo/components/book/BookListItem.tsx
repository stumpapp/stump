import { FragmentType, graphql, InterfaceLayout, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { parseGraphQLDateTime, parseGraphQLPercentageDecimal } from '~/lib/format'
import { useTranslate } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../listLayout/grid/GridImageItem'
import { ListRowItem } from '../listLayout/list'
import { Text } from '../ui'

const fragment = graphql(`
	fragment BookListItem on Media {
		id
		resolvedName
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
			height
			width
		}
		pages
		readProgress {
			page
			percentageCompleted
		}
		readHistory {
			completedAt
		}
	}
`)

export type IBookListItemFragment = FragmentType<typeof fragment>

type Props = {
	layout: InterfaceLayout
	book: IBookListItemFragment
	onPress?: () => void
}

export default function BookListItem({ layout, book, onPress }: Props) {
	const router = useRouter()
	const { t } = useTranslate()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const data = useFragment(fragment, book)

	// While technically completed if read history has length, an active read session
	// takes precedence
	const isComplete = !!data.readHistory?.length && !data.readProgress
	const percentageCompleted = isComplete
		? 100
		: parseGraphQLPercentageDecimal(data.readProgress?.percentageCompleted)
	const numberOfReads = data.readHistory?.length
	const latestCompletionDate = parseGraphQLDateTime(data.readHistory.at(0)?.completedAt)

	const sharedProps = {
		uri: data.thumbnail.url,
		title: data.resolvedName,
		onPress: onPress ?? (() => router.navigate(`/server/${serverID}/books/${data.id}`)),
		placeholderData: data.thumbnail.metadata,
		originalDimensions:
			data.thumbnail.width && data.thumbnail.height
				? { width: data.thumbnail.width, height: data.thumbnail.height }
				: null,
		percentageCompleted,
		numberOfReads,
		latestCompletionDate,
	}

	if (layout === InterfaceLayout.Grid) {
		// TODO: a different color when series is ongoing and/or num issues on stump finished < total from meta?
		return (
			<View className="w-full items-center">
				<GridImageItem {...sharedProps} />
			</View>
		)
	}

	const currentPage = data.readProgress?.page

	// just demonstration, figure out what else
	const infoItems = (
		<>
			{currentPage != null && (
				<View className="squircle px-2.5 py-0.5 flex-row items-end rounded-full bg-background-surface-secondary">
					<Text size="sm">{`${t('common.page')} ${currentPage}`}</Text>
					<Text size="xs" className="pb-0.5 text-foreground-muted">{` / ${data.pages}`}</Text>
				</View>
			)}
			{currentPage == null && data.pages > 0 && (
				<View className="squircle px-2.5 py-0.5 flex-row items-end rounded-full bg-background-surface-secondary">
					<Text size="sm">{data.pages}</Text>
					<Text size="xs" className="pb-0.5 text-foreground-muted">
						{' '}
						{t('common.pages').toLocaleLowerCase()}
					</Text>
				</View>
			)}
		</>
	)

	return <ListRowItem {...sharedProps} infoItems={infoItems} />
}
