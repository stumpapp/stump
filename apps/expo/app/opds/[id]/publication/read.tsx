import { useMemo, useState } from 'react'

import { usePublicationContext } from './context'
import { ImageBasedReader } from '~/components/book/reader'
import { hashFromURL } from './utils'

type ImageDimension = {
	height: number
	width: number
	ratio: number
}

// TODO: refactor to use imagebasedreader when able
export default function Screen() {
	const {
		publication: {
			metadata: { identifier, title },
			readingOrder = [],
		},
		url,
		progression,
	} = usePublicationContext()

	const [id] = useState(() => identifier || hashFromURL(url))

	const currentPage = useMemo(() => {
		const rawPosition = progression?.locator.locations?.at(0)?.position
		if (!rawPosition) {
			return 1
		}
		const parsedPosition = parseInt(rawPosition, 10)
		if (isNaN(parsedPosition)) {
			return 1
		}
		return parsedPosition
	}, [progression])

	return (
		<ImageBasedReader
			initialPage={currentPage}
			book={{
				id,
				name: title,
				pages: readingOrder.length,
			}}
			imageSizes={
				readingOrder
					.filter(({ height, width }) => height && width)
					.map(({ height, width }) => ({
						height,
						width,
						ratio: (width as number) / (height as number),
					})) as ImageDimension[]
			}
			pageURL={(page: number) => readingOrder[page - 1].href}
		/>
	)

	// return (
	// 	<View className="flex flex-1 items-center justify-center">
	// 		<FlatList
	// 			ref={flatList}
	// 			data={readingOrder}
	// 			keyExtractor={({ href }) => href}
	// 			renderItem={({ item: { href }, index }) => {
	// 				const size = getPageSize(index)

	// 				return (
	// 					<View
	// 						className="flex items-center justify-center"
	// 						style={{
	// 							height: safeMaxHeight,
	// 							minHeight: safeMaxHeight,
	// 							minWidth: width,
	// 							width: width,
	// 						}}
	// 					>
	// 						<Image
	// 							source={{
	// 								uri: href,
	// 								headers: {
	// 									Authorization: sdk.authorizationHeader,
	// 								},
	// 							}}
	// 							style={{
	// 								alignSelf: 'center',
	// 								height: size.height,
	// 								width: size.width,
	// 								maxWidth: width,
	// 							}}
	// 							onLoad={(event) => onImageLoaded(event, index)}
	// 						/>
	// 					</View>
	// 				)
	// 			}}
	// 			pagingEnabled
	// 			initialNumToRender={10}
	// 			maxToRenderPerBatch={10}
	// 			horizontal
	// 			initialScrollIndex={currentPage - 1}
	// 			// https://stackoverflow.com/questions/53059609/flat-list-scrolltoindex-should-be-used-in-conjunction-with-getitemlayout-or-on
	// 			onScrollToIndexFailed={(info) => {
	// 				const wait = new Promise((resolve) => setTimeout(resolve, 500))
	// 				wait.then(() => {
	// 					flatList.current?.scrollToIndex({ index: info.index, animated: true })
	// 				})
	// 			}}
	// 		/>
	// 	</View>
	// )
}
