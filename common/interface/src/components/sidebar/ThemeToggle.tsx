import { Button, useColorMode } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'phosphor-react';
import ToolTip from '../../ui/ToolTip';

export default function ThemeToggle() {
	const { colorMode, toggleColorMode } = useColorMode();

	return (
		<div>
			<AnimatePresence exitBeforeEnter initial={false}>
				<ToolTip label="Toggle theme">
					<Button
						variant="ghost"
						cursor={'pointer'}
						p={0.5}
						size="sm"
						_focus={{
							boxShadow: '0 0 0 3px rgba(196, 130, 89, 0.6);',
						}}
						onClick={toggleColorMode}
					>
						<motion.span
							key={colorMode === 'dark' ? 'moon' : 'sun'}
							initial={{ y: -30, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 30, opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							{colorMode === 'dark' ? <Moon /> : <Sun />}
						</motion.span>
					</Button>
				</ToolTip>
			</AnimatePresence>
		</div>
	);
}
