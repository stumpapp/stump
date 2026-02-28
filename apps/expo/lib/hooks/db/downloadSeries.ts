import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback } from 'react'
import { toast } from 'sonner-native'

import { useActiveServer } from '~/components/activeServer'

import { useDownloadQueue } from './downloadQueue'

const seriesBooksForDownloadQuery = graphql(`
	query SeriesBooksForDownload($id: ID!) {
		seriesById(id: $id) {
			id
			resolvedName
			library {
				id
				name
			}
			media {
				id
				extension
				resolvedName
				metadata {
					ageRating
					characters
					colorists
					coverArtists
					day
					editors
					format
					identifierAmazon
					identifierCalibre
					identifierGoogle
					identifierIsbn
					identifierMobiAsin
					identifierUuid
					genres
					inkers
					language
					letterers
					links
					month
					notes
					number
					pageCount
					pencillers
					publisher
					series
					seriesGroup
					storyArc
					storyArcNumber
					summary
					teams
					title
					titleSort
					volume
					writers
					year
				}
				readProgress {
					page
					percentageCompleted
					elapsedSeconds
					locator {
						chapterTitle
						href
						type
						title
						locations {
							fragments
							position
							progression
							totalProgression
							cssSelector
							partialCfi
						}
					}
					updatedAt
				}
				thumbnail {
					metadata {
						averageColor
						colors {
							color
							percentage
						}
						thumbhash
					}
				}
				ebook {
					toc
				}
			}
		}
	}
`)

export type UseDownloadSeriesParams = {
	serverId?: string
}

export function useDownloadSeries({ serverId }: UseDownloadSeriesParams = {}) {
	const { activeServer } = useActiveServer()

	const effectiveServerId = serverId ?? activeServer.id

	const { enqueueBook } = useDownloadQueue({ serverId: effectiveServerId })

	const { mutateAsync: fetchSeriesBooks, isPending: isEnqueuing } = useGraphQLMutation(
		seriesBooksForDownloadQuery,
	)

	const downloadSeries = useCallback(
		async (seriesId: string) => {
			const data = await fetchSeriesBooks({ id: seriesId })
			const series = data?.seriesById

			if (!series) {
				throw new Error('Series not found')
			}

			const enqueuePromises = series.media.map((book) =>
				enqueueBook({
					id: book.id,
					extension: book.extension,
					bookName: book.resolvedName,
					seriesId: series.id,
					seriesName: series.resolvedName,
					libraryId: series.library.id,
					libraryName: series.library.name,
					metadata: book.metadata,
					readProgress: book.readProgress,
					thumbnailMeta: book.thumbnail.metadata,
					toc: book.ebook?.toc,
				}),
			)

			const positions = await Promise.all(enqueuePromises)

			if (positions.every((pos) => pos === -1)) {
				toast.info('Nothing to download', {
					description: 'All books in this series are already downloaded or in the queue',
				})
			}

			return series.media.length
		},
		[enqueueBook, fetchSeriesBooks],
	)

	return {
		downloadSeries,
		isEnqueuing,
	}
}
