import { useColorMode } from '@chakra-ui/react'
import { ToastBar, Toaster } from 'react-hot-toast'

export default function Notifications() {
	const { colorMode } = useColorMode()

	return (
		<Toaster position="bottom-center">
			{(t) => (
				<ToastBar
					toast={t}
					// this is so gross, I miss tailwind
					style={{
						backgroundColor: colorMode === 'dark' ? '#3D4759' : '',
						color: colorMode === 'dark' ? '#E2E8F0' : '',
					}}
				>
					{({ icon, message }) => (
						<>
							{icon}
							{message}
						</>
					)}
				</ToastBar>
			)}
		</Toaster>
	)
}
