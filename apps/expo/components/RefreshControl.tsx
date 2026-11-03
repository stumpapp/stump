import { forwardRef } from 'react'
import { RefreshControl as RNRefreshControl, RefreshControlProps } from 'react-native'

// TODO: customize better
const RefreshControl = forwardRef<RNRefreshControl, RefreshControlProps>(
	(props: RefreshControlProps, ref) => {
		return (
			<RNRefreshControl ref={ref} colors={['grey']} progressBackgroundColor={'black'} {...props} />
		)
	},
)
RefreshControl.displayName = 'RefreshControl'

export default RefreshControl
