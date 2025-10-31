import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import PerformanceStats from 'react-native-performance-stats'

interface PerformanceMonitorProps {
	/**
	 * Track CPU usage (has small performance penalty apparently)
	 * @default false
	 */
	withCPU?: boolean
	/**
	 * Style for the container
	 */
	style?: object
}

export const PerformanceMonitor = ({ withCPU = false, style }: PerformanceMonitorProps) => {
	const [uiFps, setUiFps] = useState(0)
	const [jsFps, setJsFps] = useState(0)
	const [ram, setRam] = useState(0)
	const [cpu, setCpu] = useState(0)

	useEffect(() => {
		const listener = PerformanceStats.addListener((stats) => {
			setUiFps(stats.uiFps)
			setJsFps(stats.jsFps)
			setRam(stats.usedRam)
			if (withCPU) {
				setCpu(stats.usedCpu)
			}
		})

		PerformanceStats.start(withCPU)

		return () => {
			PerformanceStats.stop()
			listener.remove()
		}
	}, [withCPU])

	return (
		<View style={[styles.container, style]}>
			<View style={[styles.statColumn, { minWidth: 40 }]}>
				<Text style={styles.label}>UI</Text>
				<Text style={styles.value}>{uiFps.toFixed(0)}</Text>
			</View>

			<View style={[styles.statColumn, { minWidth: 40 }]}>
				<Text style={styles.label}>JS</Text>
				<Text style={styles.value}>{jsFps.toFixed(0)}</Text>
			</View>

			<View style={styles.statColumn}>
				<Text style={styles.label}>MB</Text>
				<Text style={styles.value}>{ram.toFixed(1)}</Text>
			</View>

			{withCPU && (
				<View style={styles.statColumn}>
					<Text style={styles.label}>CPU</Text>
					<Text style={styles.value}>{cpu.toFixed(1)}%</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		position: 'absolute',
		alignSelf: 'center',
		zIndex: 9999,
		padding: 4,
		borderRadius: 10,
		overflow: 'hidden',
		borderCurve: 'continuous',
		pointerEvents: 'none',
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
	},
	statColumn: {
		alignItems: 'center',
		minWidth: 60, // override this for some cols for a nicer look
		gap: 2,
	},
	label: {
		color: '#bbb',
		fontSize: 11,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
		fontVariant: ['tabular-nums'],
	},
	value: {
		color: '#fff',
		fontSize: 14,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
		fontVariant: ['tabular-nums'],
	},
})
