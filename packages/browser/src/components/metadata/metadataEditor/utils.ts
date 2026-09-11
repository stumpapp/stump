import { Header } from '@tanstack/react-table'

export const isEmptyField = (data: unknown) => {
	if (Array.isArray(data)) {
		return data.length === 0
	} else if (typeof data === 'object' && data !== null) {
		return Object.keys(data).length === 0 || Object.values(data).every(isEmptyField)
	} else {
		return !data
	}
}

function getSize(size = 100, max = Number.MAX_SAFE_INTEGER, min = 40) {
	return Math.max(Math.min(size, max), min)
}

declare module '@tanstack/react-table' {
	// @ts-expect-error: It's fine
	interface ColumnMeta {
		isGrow?: boolean
		widthPercentage?: number
	}
}

export function calculateTableSizing<DataType>(
	columns: Header<DataType, unknown>[],
	totalWidth: number,
): Record<string, number> {
	let totalAvailableWidth = totalWidth
	let totalIsGrow = 0

	// Note: key by resolved column id, def ids are undefined for accessor columns.
	// Keep this pure, mutated sizes are lost when defs are recreated after save.
	const baseSizes = new Map<string, number | undefined>()

	columns.forEach((header) => {
		const column = header.column.columnDef
		let size = column.size
		if (size == null) {
			if (!column.meta?.isGrow) {
				if (column?.meta?.widthPercentage) {
					size = column.meta.widthPercentage * totalWidth * 0.01
				} else {
					size = totalWidth / columns.length
				}
				size = getSize(size, column.maxSize, column.minSize)
			}
		}

		if (column.meta?.isGrow) totalIsGrow += 1
		else totalAvailableWidth -= getSize(size, column.maxSize, column.minSize)

		baseSizes.set(header.column.id, size)
	})

	const sizing: Record<string, number> = {}

	columns.forEach((header) => {
		const column = header.column.columnDef
		const id = header.column.id
		if (column.meta?.isGrow) {
			const calculatedSize = Math.floor(totalAvailableWidth / totalIsGrow)
			sizing[id] = getSize(calculatedSize, column.maxSize, column.minSize)
		} else {
			sizing[id] = Number(baseSizes.get(id))
		}
	})

	return sizing
}

export function calculateOptimalColumnWidth(columnId: string): number {
	const columnElement = document.getElementById(columnId)
	if (!columnElement) return 100

	// Get the computed styles
	const styles = window.getComputedStyle(columnElement)
	const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
	const border = parseFloat(styles.borderLeftWidth) + parseFloat(styles.borderRightWidth)

	return columnElement.scrollWidth + padding + border
}
