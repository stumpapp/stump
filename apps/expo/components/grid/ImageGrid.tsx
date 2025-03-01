import {
	FlashListWithHeaders,
	Header,
	HeaderProps,
	LargeHeader,
	ScalingView,
	ScrollHeaderProps,
	ScrollLargeHeaderProps,
} from '@codeherence/react-native-header'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { Any } from '~/lib/utils'

import RefreshControl from '../RefreshControl'
import ScrollHeaderSurface from '../ScrollHeaderSurface'
import { useGridItemSize } from './useGridItemSize'

type FlashListWithHeadersProps<T = Any> = React.ComponentProps<typeof FlashListWithHeaders<T>>

type IHeaderProps = Pick<
	HeaderProps,
	| 'headerLeft'
	| 'headerRight'
	| 'headerCenter'
	| 'headerLeftFadesIn'
	| 'headerCenterFadesIn'
	| 'headerRightFadesIn'
>

type Props<T = Any> = {
	largeHeader: React.ReactNode
	header?: IHeaderProps
	onRefresh?: () => void
	isRefetching?: boolean
} & Omit<
	FlashListWithHeadersProps<T>,
	| 'refreshControl'
	| 'numColumns'
	| 'estimatedItemSize'
	| 'HeaderComponent'
	| 'LargeHeaderComponent'
	| 'onEndReachedThreshold'
>

export default function ImageGrid<T = Any>({
	largeHeader,
	header,
	onRefresh,
	isRefetching,
	style,
	containerStyle,
	...props
}: Props<T>) {
	const insets = useSafeAreaInsets()

	const HeaderComponent = ({ showNavBar }: ScrollHeaderProps) => {
		return (
			<Header
				showNavBar={showNavBar}
				noBottomBorder
				headerLeftFadesIn
				headerStyle={{ height: 44 + insets.top }}
				{...header}
				SurfaceComponent={ScrollHeaderSurface}
			/>
		)
	}

	const LargeHeaderComponent = ({ scrollY }: ScrollLargeHeaderProps) => {
		return (
			<LargeHeader>
				<ScalingView
					scrollY={scrollY}
					className="-ml-2 flex-1 flex-row items-center justify-between"
					style={{ marginTop: -insets.top / 2, paddingBottom: 8 }}
				>
					{largeHeader}
				</ScalingView>
			</LargeHeader>
		)
	}

	const { numColumns, sizeEstimate } = useGridItemSize()

	return (
		<FlashListWithHeaders
			absoluteHeader
			HeaderComponent={HeaderComponent}
			LargeHeaderComponent={LargeHeaderComponent}
			numColumns={numColumns}
			className="px-4"
			style={[
				style,
				{
					flex: 1,
					zIndex: -100,
				},
			]}
			containerStyle={[
				containerStyle,
				{
					paddingBottom: insets.bottom,
				},
			]}
			estimatedItemSize={sizeEstimate}
			refreshControl={
				onRefresh ? (
					<RefreshControl refreshing={isRefetching || false} onRefresh={onRefresh} />
				) : undefined
			}
			onRefresh={onRefresh}
			refreshing={isRefetching}
			onEndReachedThreshold={props.onEndReached ? 0.75 : undefined}
			{...props}
		/>
	)
}
