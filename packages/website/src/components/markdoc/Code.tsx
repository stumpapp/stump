import React, { useEffect } from 'react';
import useIsomorphicLayoutEffect from '~hooks/useIsomorphicLayoutEffect';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';

import * as Prism from 'prismjs';
import { Check, CopySimple } from 'phosphor-react';

// import { Icon } from './Icon';

Prism.languages.markdoc = {
	tag: {
		pattern: /{%(.|\n)*?%}/i,
		inside: {
			tagType: {
				pattern: /^({%\s*\/?)(\w*|-)*\b/i,
				lookbehind: true,
			},
			id: /#(\w|-)*\b/,
			string: /".*?"/,
			equals: /=/,
			number: /\b\d+\b/i,
			variable: {
				pattern: /\$[\w.]+/i,
				inside: {
					punctuation: /\./i,
				},
			},
			function: /\b\w+(?=\()/,
			punctuation: /({%|\/?%})/i,
			boolean: /false|true/,
		},
	},
	variable: {
		pattern: /\$\w+/i,
	},
	function: {
		pattern: /\b\w+(?=\()/i,
	},
};

export interface CodeProps {
	children: React.ReactNode;
	language: string;
}

export default function Code({ children, language }: CodeProps) {
	const [copied, setCopied] = React.useState(false);
	const ref = React.useRef<HTMLPreElement>(null);

	useIsomorphicLayoutEffect(() => {
		if (ref.current) {
			console.log('ref.current', ref.current);
			// FIXME: not highlighting
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

	return (
		<div className="code" aria-live="polite">
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
			<button onClick={() => setCopied(true)}>{copied ? <Check /> : <CopySimple />}</button>
			<style jsx>
				{`
					.code {
						position: relative;
					}
					.code button {
						appearance: none;
						position: absolute;
						color: inherit;
						background: var(--code-background);
						top: ${lines.length === 1 ? '17px' : '13px'};
						right: 11px;
						border-radius: 4px;
						border: none;
						font-size: 15px;
					}
				`}
			</style>
		</div>
	);
}
