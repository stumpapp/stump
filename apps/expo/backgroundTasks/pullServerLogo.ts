import { graphql } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { DownloadOptions, File } from 'expo-file-system'
import { match, P } from 'ts-pattern'

import { cacheDirectory, serverPath } from '~/lib/filesystem'
import { createThumbnail } from '~/lib/widgets/utils'
import { isKnownServer, SavedServer, ServerAvatar, useSavedServerStore } from '~/stores/savedServer'

const avatarQuery = graphql(`
	query PullServerAvatar {
		me {
			avatar {
				url
				metadata {
					averageColor
					colors {
						color
						percentage
					}
					thumbhash
				}
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
		headers: await api.getHeaders(),
	})

	return {
		uri: file.uri,
		metadata: avatar.metadata,
	}
}

async function identifyFromServerHeader(serverHeader: string) {
	const normalized = serverHeader.toLowerCase()

	if (normalized.startsWith('codex/')) {
		return 'codex'
	}

	return null
}

async function fetchServerHeader(url: string) {
	try {
		const response = await fetch(url, { method: 'HEAD' })
		const serverHeader = await identifyFromServerHeader(response.headers.get('Server') || '')
		console.log({
			url,
			serverHeader,
			headers: response.headers,
		})
		return serverHeader
	} catch {
		return null
	}
}

async function fetchCatalogAuthor(server: SavedServer, api: Api) {
	let author: string | null = null

	const opdsVersion = server.kind === 'opds' ? 2 : 1
	console.log('opdsVersion', opdsVersion)

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
		if (!author) {
			console.log('catalog metadata', catalog.metadata)
		}
	}

	console.log('catalog author', author)

	return author && isKnownServer(author) ? author : null
}

// TODO: codex sends an ident in the `Server` header, e.g. `Server: Codex/1.0.0`,
// but no clue about others. i figure i can bake a few big ones directly
// in app (komga kavita codex etc) and use some default logo for OPDS
// if ident fails
//
//

async function identifyServer(server: SavedServer, api: Api) {
	const serverHeader = await fetchServerHeader(server.url)
	console.log('serverHeader', serverHeader)
	if (serverHeader) return serverHeader

	const catalogAuthor = await fetchCatalogAuthor(server, api)
	if (catalogAuthor) return catalogAuthor

	return null
}

// stump servers = user avatar OR stump logo (if no avatar set)
// other servers = server logo if can ident
// ^ because of this, i think the language here is a little misleading "pull avatar"
// but fine for now until i have more thinking space. it's weird because
// really only stump will pull avatars, the rest is just using baked-in logos
// depending on identification. this also means storage in sqlite needs consideration,
// because no point pointing to uri if it is a baked-in asset
// perhaps it just needs to be something like:
// type ServerAvatar = { uri: string; metadata: json } | { serverLogo: 'codex' | 'kavita' | 'komga' | 'opds' }
// omg coming back to this i forgot servers aren't sqlite lol hmm that's fine

export async function pullServerAvatar(server: SavedServer, api: Api) {
	let serverAvatar: ServerAvatar | null = null

	if (server.kind === 'stump') {
		serverAvatar = await fetchStumpAvatar(server.id, api)
	} else {
		const serverType = await identifyServer(server, api)
		console.log('serverType', serverType)
		if (serverType != null) {
			serverAvatar = { logo: serverType }
		}
	}

	const avatar = await match(serverAvatar)
		.with({ logo: P.string }, (s) => s)
		.with({ uri: P.string }, async (stumpAvatar) => {
			const destination = new File(serverPath(server.id, 'avatar.png'))
			await new File(stumpAvatar.uri).move(destination, { overwrite: true })
			return {
				uri: destination.uri,
				metadata: stumpAvatar.metadata,
			}
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
