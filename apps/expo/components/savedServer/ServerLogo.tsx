/* eslint-disable @typescript-eslint/no-require-imports */

import * as Sentry from '@sentry/react-native'
import { Asset, useAssets } from 'expo-asset'
import { useEffect } from 'react'
import { Image, Platform } from 'react-native'
import { match, P } from 'ts-pattern'

import { SavedServer } from '~/stores/savedServer'

import { TurboImage } from '../image'

type Props = {
	server: SavedServer
}

type NormalizedLogo = {
	uri: string
	isLocalAsset: boolean
	metadata: Exclude<NonNullable<SavedServer['avatar']>, { logo: string }>['metadata']
}

export function ServerLogo({ server }: Props) {
	const [assets, error] = useAssets(LOGO_REQUIRES)

	useEffect(() => {
		if (error) {
			Sentry.captureException(error, { tags: { component: 'ServerLogo' } })
		}
	}, [error])

	const serverName = match(server)
		.with({ kind: 'stump' }, () => 'stump')
		.with({ avatar: P.shape({ logo: P.string }) }, (s) => s.avatar.logo)
		.otherwise(() => 'stump')

	const logoAsset = getServerLogo(serverName, assets || [])

	const normalizedLogo: NormalizedLogo = match(server)
		.with({ avatar: P.shape({ uri: P.string }) }, ({ avatar }) => ({
			uri: avatar.uri,
			isLocalAsset: false,
			metadata: avatar.metadata,
		}))
		.otherwise(() => ({
			uri: logoAsset?.localUri || logoAsset?.uri || '',
			isLocalAsset: true,
			metadata: null, // TODO: define for the local assets
		}))

	const defaultSize = { height: 32, width: 32 }

	if (!assets) {
		return null
	}

	// FIXME: On Android TurboImage doesn't work with local assets in production builds
	if (Platform.OS === 'android') {
		return (
			<Image
				source={{
					uri: normalizedLogo.uri,
				}}
				resizeMode="contain"
				// style={{ ...defaultStyle, ...size }}
			/>
		)
	}

	return (
		<TurboImage
			source={{ uri: normalizedLogo.uri }}
			style={{
				...defaultSize,
			}}
			rounded
		/>
	)
}

const LOGO_REQUIRES = [
	require('../../assets/images/serverLogos/codex.svg'),
	require('../../assets/images/serverLogos/kavita.svg'),
	require('../../assets/images/serverLogos/komga.svg'),
	require('../../assets/images/serverLogos/stump.png'),
]

const getServerLogo = (name: string, assets: Array<Asset>) => {
	switch (name.toLowerCase()) {
		case 'codex':
			return assets[0]
		case 'kavita':
			return assets[1]
		case 'komga':
			return assets[2]
		case 'stump':
			return assets[3]
		default:
			return assets[3] // FIXME: some unknown logo, for OPDS i guess
	}
}
