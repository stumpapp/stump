import React, { useEffect, useRef, useState } from 'react';
import { Check, CopySimple } from 'phosphor-react';
import useIsomorphicLayoutEffect from '~hooks/useIsomorphicLayoutEffect';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';

import Prism from 'prismjs';

import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';

export interface CodeProps {
	children: React.ReactNode;
	language: string;
}

export default function Code({ children, language }: CodeProps) {
	const [copied, setCopied] = useState(false);
	// const [copyVisible, setCopyVisible] = useState(false);

	const ref = useRef<HTMLPreElement>(null);

	useIsomorphicLayoutEffect(() => {
		if (ref.current) {
			Prism.highlightElement(ref.current, false);
		}
	}, [children]);

	useEffect(() => {
		if (copied && ref.current) {
			copy(ref.current.innerText);
			const to = setTimeout(setCopied, 1000, false);
			return () => clearTimeout(to);
		}
	}, [copied]);

	const lang = language === 'md' ? 'markdoc' : language || 'markdoc';

	const lines = typeof children === 'string' ? children.split('\n').filter(Boolean) : [];

	// TODO: super long lines cause issues
	return (
		<div className="code relative" aria-live="polite">
			<pre
				// Prevents "Failed to execute 'removeChild' on 'Node'" error
				// https://stackoverflow.com/questions/54880669/react-domexception-failed-to-execute-removechild-on-node-the-node-to-be-re
				// @ts-ignore
				key={children}
				ref={ref}
				className={clsx(`language-${lang}`, 'rounded-lg')}
			>
				{children}
			</pre>
			<button
				onClick={() => setCopied(true)}
				className={clsx(
					lines.length === 1 ? 'top-4' : 'top-5',
					'appearance-none absolute right-3 text-gray-100',
				)}
			>
				{copied ? <Check /> : <CopySimple />}
			</button>
		</div>
	);
}
