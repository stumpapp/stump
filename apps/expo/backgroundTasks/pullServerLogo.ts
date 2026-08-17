import { graphql } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { DownloadOptions, File } from 'expo-file-system'
import { match, P } from 'ts-pattern'

import { cacheDirectory, serverPath } from '~/lib/filesystem'
import { createThumbnail } from '~/lib/widgets/utils'
import {
	isKnownServer,
	KnownServer,
	SavedServer,
	ServerAvatar,
	serverAvatar,
	useSavedServerStore,
} from '~/stores/savedServer'

const avatarQuery = graphql(`
	query PullServerAvatar {
		me {
			avatar {
				url
				metadata {
					averageColor
				}
				lastModified
			}
		}
	}
`)

async function downloadImage(
	serverId: string,
	url: string,
	options?: DownloadOptions,
): Promise<File> {
	const destination = new File(cacheDirectory, `${serverId}.png`)
	const tmp = await File.downloadFileAsync(url, destination, { ...options, idempotent: true })
	const resized = await createThumbnail(tmp.uri)
	await resized.move(destination, { overwrite: true })
	return destination
}

async function fetchStumpAvatar(serverId: string, api: Api): Promise<ServerAvatar | null> {
	const {
		me: { avatar },
	} = await api.execute(avatarQuery)

	if (!avatar) return null

	const file = await downloadImage(serverId, avatar.url, {
		headers: await api.getHeaders(), // auth is important ig
	})

	return {
		uri: file.uri,
		metadata: avatar.metadata,
	}
}

async function identifyFromServerHeader(serverHeader: string): Promise<KnownServer | null> {
	const normalized = serverHeader.toLowerCase()

	if (normalized.startsWith('codex/')) {
		return 'codex'
	}

	return null
}

async function fetchServerHeader(url: string): Promise<KnownServer | null> {
	try {
		const response = await fetch(url, { method: 'HEAD' })
		const serverHeader = await identifyFromServerHeader(response.headers.get('Server') || '')
		return serverHeader
	} catch {
		return null
	}
}

async function fetchCatalogAuthor(server: SavedServer, api: Api) {
	let author: string | null = null

	const opdsVersion = server.kind === 'opds' ? 2 : 1

	if (opdsVersion === 1) {
		const catalog = await api.opdsLegacy.feed(server.url)
		author = catalog.author?.name?.toLowerCase() || null
	} else {
		const catalog = await api.opds.feed(server.url)
		author = match(catalog.metadata.author)
			.with(
				P.array(P.shape({ name: P.string })),
				(authors) => authors[0]?.name?.toLowerCase() || null,
			)
			.with(P.shape({ name: P.string }), (author) => author.name.toLowerCase())
			.with(P.string, (author) => author.toLowerCase())
			.otherwise(() => null)
	}

	return author && isKnownServer(author) ? author : null
}

// a few knowns to document:
// - codex does not write an author field in opds feeds, but _does_ send ident in `Server` header
//   if you configure properly (e.g., a reverse proxy might overwrite by default)
// - kavita writes `Kavita` in author field in opds feeds
async function identifyServer(server: SavedServer, api: Api): Promise<KnownServer | null> {
	const serverHeader = await fetchServerHeader(server.url)
	if (serverHeader) return serverHeader

	const catalogAuthor = await fetchCatalogAuthor(server, api)
	if (catalogAuthor) return catalogAuthor

	return null
}

export async function pullServerAvatar(server: SavedServer, api: Api) {
	let avatarData: ServerAvatar | null = null

	// when server is stump, we just pull an avatar if the user has one uploaded
	if (server.kind === 'stump') {
		avatarData = await fetchStumpAvatar(server.id, api)
	} else {
		// otherwise we try to sus out what kind of server this is and use one of the baked-in
		// logos if it is a "known" server
		const knownServer = await identifyServer(server, api)
		if (knownServer != null) {
			avatarData = { logo: knownServer }
		}
	}

	const avatar = await match(avatarData)
		.with({ logo: P.string }, (s) => s)
		.with({ uri: P.string }, async (data) => {
			const destination = new File(serverPath(server.id, 'avatar.png'))
			await new File(data.uri).move(destination, { overwrite: true })
			return (
				serverAvatar.safeParse({
					uri: destination.uri,
					metadata: data.metadata,
					lastModified: data.lastModified ?? new Date(),
				}).data ?? null
			)
		})
		.otherwise(() => null)

	const editServer = useSavedServerStore.getState().editServer
	if (serverAvatar) {
		editServer(server.id, {
			...server,
			avatar,
		})
	}
}

type ServerSdkPair = {
	server: SavedServer
	api: Api
}

export const executePullServerLogos = async (params: ServerSdkPair[]): Promise<void> => {
	await Promise.all(params.map(({ server, api }) => pullServerAvatar(server, api)))
}
