import { useTheme } from '@stump/client'
import { ToastBar, Toaster } from 'react-hot-toast'

export default function Notifications() {
	const { isDark } = useTheme()

	return (
		<Toaster position="bottom-center">
			{(t) => (
				<ToastBar
					toast={t}
					// this is so gross, I miss tailwind
					style={{
						backgroundColor: isDark ? '#3D4759' : '',
						color: isDark ? '#E2E8F0' : '',
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
