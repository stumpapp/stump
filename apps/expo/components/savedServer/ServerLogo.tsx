/* eslint-disable @typescript-eslint/no-require-imports */

import * as Sentry from '@sentry/react-native'
import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia'
import { Asset, useAssets } from 'expo-asset'
import { useEffect, useMemo } from 'react'
import { Image, Platform } from 'react-native'
import { match, P } from 'ts-pattern'

import { toRgba } from '~/lib/constants'
import { KnownServer, SavedServer } from '~/stores/savedServer'

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
			uri: avatar.lastModified ? `${avatar.uri}?lastModified=${avatar.lastModified}` : avatar.uri,
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
				style={{ ...defaultSize }}
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
	require('../../assets/images/serverLogos/codex.png'),
	require('../../assets/images/serverLogos/kavita.png'),
	require('../../assets/images/serverLogos/komga.png'),
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

const LOGO_GLOW_COLORS: Record<KnownServer, string> = {
	stump: '#FB842C',
	kavita: '#4AC695',
	komga: '#015FD3',
	codex: '#D97700',
	opds: '#64748B',
}

type GlowProps = {
	height: number
	width: number
	padding?: number
	logoSize?: number
	// ^ all these will be used to position the gradient to give it that
	// look of blooming outward from logo
} & Props

export function ServerLogoGlow({ server, height, width, padding = 16, logoSize = 32 }: GlowProps) {
	// stump doesn't really support anything outside of stump or opds, so opds operates
	// as the fallback here if a server cannot be identified as any "known" server.
	// ideally though that list will grow to whatever folks use so people can have
	// their nice icons
	const glowColor = useMemo(
		() =>
			match(server)
				.with(
					{ avatar: P.shape({ metadata: { averageColor: P.string } }) },
					({ avatar }) => avatar.metadata.averageColor,
				)
				.with(
					{ avatar: P.shape({ logo: P.string }) },
					({ avatar }) => LOGO_GLOW_COLORS[avatar.logo] ?? LOGO_GLOW_COLORS.opds,
				)
				.with({ kind: 'stump' }, () => LOGO_GLOW_COLORS.stump)
				.otherwise(() => LOGO_GLOW_COLORS.opds),
		[server],
	)

	const logoCenterX = width - padding - logoSize / 2
	const logoCenterY = padding + logoSize / 2
	// ^ a little basic math so that we know where the bloom outward should start
	const glowRadius = Math.max(width, height) * 1.15

	// a LOT of this was really (kinda annoying) meticulous tweaking. i think i got it to
	// a decent enough spot here
	return (
		<Canvas
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width,
				height,
			}}
		>
			<Rect x={0} y={0} width={width} height={height}>
				<RadialGradient
					c={vec(logoCenterX, logoCenterY)}
					r={glowRadius}
					colors={[
						toRgba(glowColor, 0.18),
						toRgba(glowColor, 0.1),
						toRgba(glowColor, 0.03),
						'transparent',
					]}
					positions={[0, 0.3, 0.65, 1]}
				/>
			</Rect>
		</Canvas>
	)
}
