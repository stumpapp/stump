import { toast } from 'sonner'

export const RESTRICTED_MODE = Boolean(import.meta.env.RESTRICTED_MODE)

export function restrictedToast() {
	toast.error('This action is not available in restricted mode 😓')
}
