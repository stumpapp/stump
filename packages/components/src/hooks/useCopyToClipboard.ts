import { useCallback, useEffect, useRef, useState } from 'react'

export function useCopyToClipboard(data: string, duration = 2000) {
	const [copied, setCopied] = useState(false)

	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	const copy = useCallback(async () => {
		await navigator.clipboard.writeText(data)
		setCopied(true)
		timeoutRef.current = setTimeout(() => setCopied(false), duration)
	}, [data, duration])

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return [copy, copied] as const
}
