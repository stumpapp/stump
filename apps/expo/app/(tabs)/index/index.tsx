import { Api, legacyFeed } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { XMLParser } from 'fast-xml-parser'
import partition from 'lodash/partition'
import { ExternalLink, Rss, Server } from 'lucide-react-native'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Linking, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { parseXml } from 'react-native-turboxml'

import EmptyState from '~/components/EmptyState'
import { useOwlHeaderOffset } from '~/components/Owl'
import DeleteServerConfirmation from '~/components/savedServer/DeleteServerConfirmation'
import EditServerDialog from '~/components/savedServer/EditServerDialog'
import SavedServerListItem from '~/components/savedServer/SavedServerListItem'
import { Button, Icon, ListEmptyMessage, Text } from '~/components/ui'
import { useSavedServers } from '~/stores'
import { CreateServer, SavedServer, SavedServerWithConfig } from '~/stores/savedServer'

export default function Screen() {
	const { savedServers, stumpEnabled, updateServer, deleteServer, getServerConfig } =
		useSavedServers()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const [stumpServers, opdsServers] = partition(savedServers, (server) => server.kind === 'stump')
	const [editingServer, setEditingServer] = useState<SavedServerWithConfig | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)

	const allOPDSServers = [...stumpServers.filter((server) => server.stumpOPDS), ...opdsServers]

	const defaultServer = savedServers.find((server) => server.defaultServer)

	const [didMount, setDidMount] = useState(false)
	useEffect(() => {
		if (!didMount) {
			setDidMount(true)
		}
	}, [didMount])

	useEffect(
		() => {
			if (!didMount) return

			if (defaultServer) {
				router.push({
					// @ts-expect-error: string path
					pathname: defaultServer.kind === 'stump' ? '/server/[id]' : '/opds/[id]',
					params: { id: defaultServer.id },
				})
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[router, didMount],
	)

	// const serverStatuses = useQueries({
	// 	queries: stumpServers.map((server) => ({
	// 		queryFn: async () =>
	// 			({
	// 				name: server.name,
	// 				status: await checkUrl(formatApiURL(server.url, 'v1')),
	// 			}) as PingResult,
	// 		queryKey: ['ping', server.url, server.name],
	// 		refetchInterval: (result?: PingResult) => {
	// 			if (!result) return false
	// 			return result.status ? PING_HEALTHY_INTERVAL_MS : PING_UNHEALTHY_INTERVAL_MS
	// 		},
	// 	})),
	// })

	const onConfirmDelete = useCallback(() => {
		if (deletingServer) {
			deleteServer(deletingServer.id)
			setDeletingServer(null)
		}
	}, [deletingServer, deleteServer])

	const onSelectForEdit = useCallback(
		async (server: SavedServer) => {
			const config = await getServerConfig(server.id)
			setEditingServer({ ...server, config })
		},
		[getServerConfig],
	)

	const onEdit = useCallback(
		async (server: CreateServer) => {
			if (editingServer) {
				setEditingServer(null)
				await updateServer(editingServer.id, server)
			}
		},
		[setEditingServer, updateServer, editingServer],
	)

	const isCleanSlate = stumpServers.length === 0 && opdsServers.length === 0
	const emptyContainerStyle = useOwlHeaderOffset()

	return (
		<Fragment>
			<DeleteServerConfirmation
				deletingServer={deletingServer}
				onClose={() => setDeletingServer(null)}
				onConfirm={onConfirmDelete}
			/>

			<EditServerDialog
				editingServer={editingServer}
				onClose={() => setEditingServer(null)}
				onSubmit={onEdit}
			/>

			{isCleanSlate && (
				<EmptyState
					title="Nothing to show yet"
					message="Get started by adding a server to access book collections"
					actions={
						<>
							<Button
								variant="brand"
								size="lg"
								roundness="full"
								className="relative"
								onPress={() => Linking.openURL('https://www.stumpapp.dev/guides/mobile/app')}
							>
								<Text>See Documentation</Text>

								<Icon
									as={ExternalLink}
									size={16}
									className="absolute right-4 transform text-foreground"
								/>
							</Button>
						</>
					}
					containerStyle={emptyContainerStyle}
				/>
			)}

			{!isCleanSlate && (
				<ScrollView
					key={`${width}-${allOPDSServers.length}-${stumpServers.length}-${stumpEnabled}`}
					className="flex-1 bg-background"
					contentInsetAdjustmentBehavior="automatic"
				>
					<Button
						variant="brand"
						size="lg"
						roundness="full"
						className="relative"
						onPress={debugParseXml}
					>
						<Text>Test</Text>
					</Button>
					<View className="flex-1 items-start justify-start gap-5 bg-background p-6">
						{stumpEnabled && (
							<View className="flex w-full items-start gap-2">
								<Text className="text-foreground-muted">Stump</Text>

								{!stumpServers.length && (
									<ListEmptyMessage icon={Server} message="No Stump servers added" />
								)}

								{stumpServers.map((server) => (
									<SavedServerListItem
										key={server.id}
										server={server}
										onEdit={() => onSelectForEdit(server)}
										onDelete={() => setDeletingServer(server)}
									/>
								))}
							</View>
						)}

						<View className="flex w-full items-start gap-2">
							<Text className="text-foreground-muted">OPDS</Text>

							{!allOPDSServers.length && (
								<ListEmptyMessage icon={Rss} message="No OPDS feeds added" />
							)}

							{allOPDSServers.map((server) => (
								<SavedServerListItem
									key={server.id}
									server={server}
									forceOPDS
									onEdit={() => onSelectForEdit(server)}
									onDelete={() => setDeletingServer(server)}
								/>
							))}
						</View>
					</View>
				</ScrollView>
			)}
		</Fragment>
	)
}

const entryXml = `<feed>
<id>e2fb1338-88a2-433a-8e01-1b508422f981</id>
<title>Becky Chambers</title>
<updated>2026-02-01T22:25:25.029631+00:00</updated>
<author>
<name>Stump</name>
<uri>https://github.com/stumpapp/stump</uri>
</author>
<link type="application/atom+xml;profile=opds-catalog;kind=navigation" rel="self" href="/opds/v1.2/series/e2fb1338-88a2-433a-8e01-1b508422f981?page=1"/>
<link type="application/atom+xml;profile=opds-catalog;kind=navigation" rel="start" href="/opds/v1.2/catalog"/>
<link type="application/atom+xml;profile=opds-catalog;kind=navigation" rel="previous" href="/opds/v1.2/series/e2fb1338-88a2-433a-8e01-1b508422f981?page=0"/>
<entry>
</entry>
<entry>
<title>A Prayer for the Crown-Shy--A Monk and Robot Book</title>
<id>440f3033-5e88-4541-b9aa-6e1d5ef4eba8</id>
<updated>2026-02-01T22:25:24.993934+00:00</updated>
<content>
4.7 MiB - epub<br/><br/><p><b>"Tender and healing... I'm prescribing a preorder to anyone who has ever felt lost. Stunning, kind, necessary." &#8212;Sarah Gailey on book 1: <i>A Psalm for the Wild-Built</i></b><br><b><i>A Prayer for the Crown-Shy</i> is a story of kindness and love from one of the foremost practitioners of hopeful SF.</b><br>After touring the rural areas of Panga, Sibling Dex (a Tea Monk of some renown) and Mosscap (a robot sent on a quest to determine what humanity really needs) turn their attention to the villages and cities of the little moon they call home.<br>They hope to find the answers they seek, while making new friends, learning new concepts, and experiencing the entropic nature of the universe.<br>Becky Chambers's new series continues to ask: in a world where people have what they want, does having more even matter?<br>At the Publisher's request, this title is being sold without Digital Rights Management Software (DRM) applied.</p>
</content>
<link type="image/jpeg" rel="http://opds-spec.org/image/thumbnail" href="/opds/v1.2/books/440f3033-5e88-4541-b9aa-6e1d5ef4eba8/thumbnail"/>
<link type="image/jpeg" rel="http://opds-spec.org/image" href="/opds/v1.2/books/440f3033-5e88-4541-b9aa-6e1d5ef4eba8/pages/0?zero_based=true"/>
<link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="/opds/v1.2/books/440f3033-5e88-4541-b9aa-6e1d5ef4eba8/file/A%20Prayer%20for%20the%20Crown-Shy--A%20Monk%20and%20Robot%20Book%20%28Becky%20Chambers%29%20%28Z-Library%29.epub"/>
<link href="/opds/v1.2/books/440f3033-5e88-4541-b9aa-6e1d5ef4eba8/pages/{pageNumber}?zero_based=true" type="image/jpeg" rel="http://vaemendis.net/opds-pse/stream" pse:count="19"/>
</entry>
<entry>
</entry>
<entry>
<title>The Long Way to a Small, Angry Planet</title>
<id>9a4aac21-c86c-4718-b6e6-9720f56cc00b</id>
<updated>2026-02-01T22:25:25.007668+00:00</updated>
<content>
0.5 MiB - epub<br/><br/><div><p>When Rosemary Harper joins the crew of the Wayfarer, she isn't expecting much. The Wayfarer, a patched-up ship that's seen better days, offers her everything she could possibly want: a small, quiet spot to call home for a while, adventure in far-off corners of the galaxy, and distance from her troubled past. But Rosemary gets more than she bargained for with the Wayfarer. The crew is a mishmash of species and personalities, from Sissix, the friendly reptillian pilot, to Kizzy and Jenks, the constantly sparring engineers who keep the ship running. Life on board is chaotic, but more or less peaceful - exactly what Rosemary wants. Until the crew are offered the job of a lifetime: the chance to build a hyperspace tunnel to a distant planet. They'll earn enough money to live comfortably for years...if they survive the long trip through war-torn interstellar space without endangering any of the fragile alliances that keep the galaxy peaceful. But Rosemary isn't the only person on board with secrets to hide, and the crew will soon discover that space may be vast, but spaceships are very small indeed.</p><p>**</p></div>
</content>
<link type="image/jpeg" rel="http://opds-spec.org/image/thumbnail" href="/opds/v1.2/books/9a4aac21-c86c-4718-b6e6-9720f56cc00b/thumbnail"/>
<link type="image/jpeg" rel="http://opds-spec.org/image" href="/opds/v1.2/books/9a4aac21-c86c-4718-b6e6-9720f56cc00b/pages/0?zero_based=true"/>
<link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="/opds/v1.2/books/9a4aac21-c86c-4718-b6e6-9720f56cc00b/file/Becky%20Chambers%20-%20The%20Long%20Way%20to%20a%20Small%2C%20Angry%20Planet%20%282015%2C%20Hachette%20UK%29%20-%20libgen.li.epub"/>
<link href="/opds/v1.2/books/9a4aac21-c86c-4718-b6e6-9720f56cc00b/pages/{pageNumber}?zero_based=true" type="image/jpeg" rel="http://vaemendis.net/opds-pse/stream" pse:count="32"/>
</entry>
<entry>
<title>Record of a Spaceborn Few</title>
<id>0ba3a00f-626b-4b06-9db7-1460e9fc3148</id>
<updated>2026-02-01T22:25:25.019347+00:00</updated>
<content>
1.1 MiB - epub<br/><br/><p>Return to the sprawling universe of the Galactic Commons, as humans, artificial intelligence, aliens, and some beings yet undiscovered explore what it means to be a community in this exciting third adventure in the acclaimed and multi-award-nominated science fiction Wayfarers series, brimming with heartwarming characters and dazzling space adventure.</p><p>Hundreds of years ago, the last humans on Earth boarded the Exodus Fleet in search of a new home among the stars. After centuries spent wandering empty space, their descendants were eventually accepted by the well-established species that govern the Milky Way.</p><p>But that was long ago. Today, the Exodus Fleet is a living relic, the birthplace of many, yet a place few outsiders have ever visited. While the Exodans take great pride in their original community and traditions, their culture has been influenced by others beyond their bulkheads. As many Exodans leave for alien cities or terrestrial colonies, those who remain are...
</content>
<link type="image/jpeg" rel="http://opds-spec.org/image/thumbnail" href="/opds/v1.2/books/0ba3a00f-626b-4b06-9db7-1460e9fc3148/thumbnail"/>
<link type="image/jpeg" rel="http://opds-spec.org/image" href="/opds/v1.2/books/0ba3a00f-626b-4b06-9db7-1460e9fc3148/pages/0?zero_based=true"/>
<link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="/opds/v1.2/books/0ba3a00f-626b-4b06-9db7-1460e9fc3148/file/Record%20of%20a%20Spaceborn%20Few%20%28Chambers%20Becky%29.epub"/>
<link href="/opds/v1.2/books/0ba3a00f-626b-4b06-9db7-1460e9fc3148/pages/{pageNumber}?zero_based=true" type="image/jpeg" rel="http://vaemendis.net/opds-pse/stream" pse:count="82"/>
</entry>
<entry>
<title>The Galaxy, and the Ground Within</title>
<id>40613dff-3768-4f84-8fdd-8b0c48a0ad78</id>
<updated>2026-02-01T22:25:25.029594+00:00</updated>
<content>
0.4 MiB - epub<br/><br/><div> <br/><p><strong>FROM THE </strong><span style="font-weight: 600; font-style: italic">SUNDAY TIMES</span><strong> BESTSELLING AUTHOR AND</strong> <strong>HUGO AWARD WINNER FOR BEST SERIES</strong></p> <br/><p style="font-weight: 600">The stunning finale to the award-winning Wayfarers series by Becky Chambers, author of the beloved <em>The Long Way to a Small, Angry Planet</em>.</p> <br/><p>When a freak technological failure halts traffic to and from the planet Gora, three strangers are thrown together unexpectedly, with seemingly nothing to do but wait.</p> <br/><p>Pei is a cargo runner at a personal crossroads, torn between her duty to her people, and her duty to herself.</p> <br/><p>Roveg is an exiled artist, with a deeply urgent, and longed for, family appointment to keep.</p> <br/><p>Speaker has never been far from her twin but now must endure the unendurable: separation.</p> <br/><p>Under the care of Ouloo, an enterprising alien, and Tupo, her occasionally helpful child, the trio are compelled to confront where they've been, where they might go, and what they might be to one another.</p> <br/><p style="font-weight: 600">Together they will discover that even in the vastness of space, they're not alone.</p> <br/><p style="font-weight: 600">PRAISE FOR THE WAYFARERS</p> <br/><p style="font-weight: 600">'Becky Chambers is a wonder, and I feel better for having her books in my life' JOHN CONNOLLY</p> <br/><p style="font-weight: 600">'In a word, brilliant' ANDREW CALDECOTT</p> <br/><p style="font-weight: 600">'A quietly profound, humane tour de force' <em>GUARDIAN</em></p> <br/><p style="font-weight: 600">'Chambers is simply an exceptional talent' <em>TOR.COM</em></p> <br/><p style="font-weight: 600">'Becky Chambers takes space opera in a whole new and unexpected direction' BEN AARONOVITCH</p></div>
</content>
<link type="image/jpeg" rel="http://opds-spec.org/image/thumbnail" href="/opds/v1.2/books/40613dff-3768-4f84-8fdd-8b0c48a0ad78/thumbnail"/>
<link type="image/jpeg" rel="http://opds-spec.org/image" href="/opds/v1.2/books/40613dff-3768-4f84-8fdd-8b0c48a0ad78/pages/0?zero_based=true"/>
<link type="application/epub+zip" rel="http://opds-spec.org/acquisition" href="/opds/v1.2/books/40613dff-3768-4f84-8fdd-8b0c48a0ad78/file/The%20Galaxy%2C%20and%20the%20Ground%20Within%20%28Becky%20Chambers%29.epub"/>
<link href="/opds/v1.2/books/40613dff-3768-4f84-8fdd-8b0c48a0ad78/pages/{pageNumber}?zero_based=true" type="image/jpeg" rel="http://vaemendis.net/opds-pse/stream" pse:count="66"/>
</entry>
</feed>`

function debugParseXml() {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
	})
	const result = parser.parse(entryXml)

	console.log('"pse:count" exists?', JSON.stringify(result).includes('pse:count'))
}

async function testOpds() {
	const api = new Api({
		baseURL: 'http://localhost:10801/opds/v1.2/catalog',
		authMethod: 'basic',
		shouldFormatURL: false,
	})
	api.basicAuth = {
		username: 'oromei',
		password: 'oromei',
	}
	try {
		console.log('Testing OPDS Legacy API parsing...')
		const jsParsingStart = Date.now()
		const jsParsing = await api.opdsLegacy.catalog()
		const jsParsingEnd = Date.now()

		// const nativeParsingStart = Date.now()
		// const navtiveParsing = parseXml(await api.opdsLegacy.catalogRaw())
		// const nativeParsingEnd = Date.now()

		// TODO: The native parsing was... slower?? For simplicity I'll defer this for now,
		// both were in the 900-1100ms range which is so gross. The bulk of functionality
		// can be roughed out without optimization ig
		console.log('JS Parsing Time:', jsParsingEnd - jsParsingStart, 'ms', {
			parsedValue: JSON.stringify(jsParsing, null, 2),
		})
		console.log('-----------------------------------')
		// console.log('Raw catalog', {
		// 	response: await api.opdsLegacy.catalogRaw(),
		// })
		// console.log('Native Parsing Time:', nativeParsingEnd - nativeParsingStart, 'ms', navtiveParsing)
	} catch (err) {
		console.error('Error testing OPDS Legacy API parsing:', err)
	}
}
