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

	columns.forEach((header) => {
		const column = header.column.columnDef
		if (column.size == null) {
			if (!column.meta?.isGrow) {
				let calculatedSize = 100
				if (column?.meta?.widthPercentage) {
					calculatedSize = column.meta.widthPercentage * totalWidth * 0.01
				} else {
					calculatedSize = totalWidth / columns.length
				}

				const size = getSize(calculatedSize, column.maxSize, column.minSize)

				column.size = size
			}
		}

		if (column.meta?.isGrow) totalIsGrow += 1
		else totalAvailableWidth -= getSize(column.size, column.maxSize, column.minSize)
	})

	const sizing: Record<string, number> = {}

	columns.forEach((header) => {
		const column = header.column.columnDef
		if (column.meta?.isGrow) {
			let calculatedSize = 100
			calculatedSize = Math.floor(totalAvailableWidth / totalIsGrow)
			const size = getSize(calculatedSize, column.maxSize, column.minSize)
			column.size = size
		}

		sizing[`${column.id}`] = Number(column.size)
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
