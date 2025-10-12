import { useCallback, useEffect, useRef, useState } from 'react'
import { useCopyToClipboard as useClipboard } from 'react-use'

export function useCopyToClipboard(data: string, duration = 2000) {
	const [copied, setCopied] = useState(false)

	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	const [, copyToClipboard] = useClipboard()

	const copy = useCallback(async () => {
		await copyToClipboard(data)
		setCopied(true)
		timeoutRef.current = setTimeout(() => setCopied(false), duration)
	}, [data, duration, copyToClipboard])

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return [copy, copied] as const
}
