import { useTheme } from '@stump/client'
import { ToastBar, Toaster } from 'react-hot-toast'

// TODO: migrate to the radix toaster components
export default function Notifications() {
	const { isDark } = useTheme()

	return (
		<Toaster position="bottom-right">
			{(t) => (
				<ToastBar
					toast={t}
					style={{
						backgroundColor: isDark ? '#252729' : undefined,
						color: isDark ? '#E2E8F0' : undefined,
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
