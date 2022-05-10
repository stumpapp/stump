import React from 'react';
import { Toaster, ToastBar } from 'react-hot-toast';

// I don't really need this but keeping it abstracted in case I want to
// do something more custom with the notifications. Can also choose to use
// the useToaster() hook
export default function Notifications() {
	return (
		<Toaster position="bottom-center">
			{(t) => (
				<ToastBar toast={t}>
					{({ icon, message }) => (
						<>
							{icon}
							{message}
							{/* {t.type !== 'loading' && (
								<button onClick={() => toast.dismiss(t.id)}>X</button>
							)} */}
						</>
					)}
				</ToastBar>
			)}
		</Toaster>
	);
}
