import { SafeAreaView } from 'react-native'

import Header from './Header'

type Props = {
	children: React.ReactNode
}

export default function ImageBasedReaderContainer({ children }: Props) {
	return (
		<SafeAreaView className="flex flex-1 items-center justify-center">
			<Header />
			{children}
		</SafeAreaView>
	)
}
