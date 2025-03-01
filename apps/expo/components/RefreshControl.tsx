import { forwardRef } from 'react'
import { RefreshControl as RNRefreshControl, RefreshControlProps } from 'react-native'

import { useColors } from '~/lib/constants'

// TODO: customize better
const RefreshControl = forwardRef<RNRefreshControl, RefreshControlProps>(
	(props: RefreshControlProps, ref) => {
		const colors = useColors()
		return (
			<RNRefreshControl
				ref={ref}
				colors={[colors.foreground.muted]}
				progressBackgroundColor={colors.background.DEFAULT}
				{...props}
			/>
		)
	},
)
RefreshControl.displayName = 'RefreshControl'

export default RefreshControl
