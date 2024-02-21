import { RouteProp, useRoute } from '@react-navigation/native'

import { Link, ScreenRootView, Text } from '@/components'

type Params = {
	params: {
		id: string
	}
}

export default function BookOverview() {
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	return (
		<ScreenRootView>
			<Text>I am overview</Text>
			<Link to={{ params: { id }, screen: 'BookReader' }} className="w-full p-3 text-left">
				Read
			</Link>
		</ScreenRootView>
	)
}
