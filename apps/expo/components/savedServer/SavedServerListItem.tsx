import { queryClient } from '@stump/client'
import { Api } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { KeyRound, Rss, Sliders, SquareX, Trash } from 'lucide-react-native'
import { useMemo } from 'react'
import { View } from 'react-native'
import { match } from 'ts-pattern'

import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'
import { useCacheStore } from '~/stores/cache'
import { SavedServer, useSavedServers } from '~/stores/savedServer'

import { useGridItemSize } from '../listLayout/grid/useGridItemSize'
import { Text } from '../ui'
import { ContextMenu } from '../ui/context-menu/context-menu'
import { ServerLogo, ServerLogoGlow } from './ServerLogo'

type Props = {
	server: SavedServer
	onEdit: () => void
	onDelete: () => void
}

export default function SavedServerListItem({ server, onEdit, onDelete }: Props) {
	const { t } = useTranslate()

	const { deleteServerToken } = useSavedServers()

	const deleteCachedSdk = useCacheStore((state) => state.removeSDK)
	const cachedServerSdk = useCacheStore((state) => state.sdks[server.id] as Api | undefined)

	const textCase = usePreferencesStore((state) => state.textCase)

	const onClearCache = () => {
		// We can assume no SDK means no cache
		if (cachedServerSdk) {
			queryClient.removeQueries({
				exact: false,
				predicate: ({ queryKey }) => queryKey.includes(server.id),
			})
		}
	}

	const router = useRouter()

	const serverPath = match(server.kind)
		.with('stump', () => '/server/[id]')
		.with('opds', () => '/opds/[id]')
		.with('opds-legacy', () => '/opds-legacy/[id]')
		.exhaustive()

	const serverKind = useMemo(() => {
		const kind = match(server.kind)
			.with('stump', () => 'Stump')
			.with('opds', () => 'OPDS v2.0')
			.with('opds-legacy', () => 'OPDS v1.2')
			.exhaustive()
		// don't really bother with the other cases, opds is an acronym + the version shorthand
		// so really the only one that would make sense is lowercase
		return textCase === 'lowerCase' ? kind.toLowerCase() : kind
	}, [server.kind, textCase])

	// TODO: isn't rly meant for this, so create more generic grid sizing hook?
	const { itemWidth } = useGridItemSize()

	const onPress = (overridePath?: string) => {
		router.push({
			// @ts-expect-error: It's fine
			pathname: overridePath || serverPath,
			params: {
				id: server.id,
			},
		})
	}

	return (
		<View className="mx-auto flex-1" style={{ width: itemWidth }}>
			<ContextMenu
				onPress={() => onPress()}
				groups={[
					...(server.kind === 'stump'
						? [
								{
									items: [
										{
											label: t('common.accessOpdsV2'),
											icon: {
												ios: 'antenna.radiowaves.left.and.right',
												android: Rss,
											},
											onPress: () => onPress('/opds/[id]'),
										} as const,
										{
											label: t('common.accessOpdsV1'),
											icon: {
												ios: 'antenna.radiowaves.left.and.right',
												android: Rss,
											},
											onPress: () => onPress('/opds-legacy/[id]'),
										} as const,
									],
								},
							]
						: []),
					{
						items: [
							{
								label: t('common.edit'),
								icon: {
									ios: 'slider.horizontal.2.square.on.square',
									android: Sliders,
								},
								onPress: onEdit,
							},
							{
								label: t('savedServerActions.clearCache'),
								icon: {
									ios: 'clear',
									android: SquareX,
								},
								onPress: onClearCache,
								disabled: !cachedServerSdk,
							},
							...(server.kind === 'stump'
								? [
										{
											label: t('savedServerActions.discardTokens.label'),
											subtext: t('savedServerActions.discardTokens.description'),
											icon: {
												ios: 'key.fill',
												android: KeyRound,
											},
											onPress: async () => {
												await deleteServerToken(server.id)
												const idsToDelete = [
													server.id,
													...(server.stumpOPDS ? [`${server.id}-opds`] : []),
												]
												idsToDelete.forEach((id) => deleteCachedSdk(id))
											},
										} as const,
									]
								: []),
						],
					},
					{
						items: [
							{
								label: t('common.delete'),
								icon: {
									ios: 'trash',
									android: Trash,
								},
								onPress: onDelete,
								role: 'destructive',
							},
						],
					},
				]}
			>
				<View className="px-4 py-4 tablet:py-5 squircle ios:rounded-[2rem] bg-background-surface h-36 border-black/5 dark:border-white/[0.07] flex w-full flex-1 overflow-hidden rounded-3xl border">
					<ServerLogoGlow server={server} width={itemWidth} height={144} />

					<View className="flex-1 flex-row items-start justify-between">
						{/*TODO: pulsing dot, green = ping works + authed, yellow = ping works but 4xx err, red ping failed*/}
						<Text
							className="text-base font-medium"
							numberOfLines={2}
							style={{
								maxWidth: itemWidth - 56, // breathing room for icon and text
							}}
						>
							{server.name}
						</Text>
						<ServerLogo server={server} />
					</View>

					<View className="flex-row items-start justify-between">
						<Text size="sm" className="text-foreground-muted">
							{serverKind}
						</Text>
					</View>
				</View>
			</ContextMenu>
		</View>
	)
}
