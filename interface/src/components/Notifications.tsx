import { ToastBar, Toaster } from 'react-hot-toast'

// TODO: migrate to the radix toaster components
export default function Notifications() {
	return (
		<Toaster position="bottom-right">
			{(t) => (
				<ToastBar
					toast={t}
					style={{
						backgroundColor: '--var(twc-background-200)',
						color: '--var(twc-contrast)',
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
