import React, { useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ArrowSquareOut } from 'phosphor-react';

import Prism from 'prismjs';

import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';

import '../styles/darcula.css';
import '../styles/markdown.css';

// https://marked.js.org/using_advanced#options
marked.setOptions({
	highlight: function (code, lang) {
		if (Prism.languages[lang]) {
			return Prism.highlight(code, Prism.languages[lang], lang);
		} else {
			return code;
		}
	},
	sanitizer: DOMPurify.sanitize,
	gfm: true,
	breaks: true,
	headerIds: true,
});

interface Props {
	text: string;
	lastModified: string | null;
}

export default function Markdown({ text, lastModified }: Props) {
	useEffect(() => {
		// https://spdevuk.com/how-to-create-code-copy-button/
		// const highlights = document.querySelectorAll("div.highlight")
		// highlights.forEach(div => {
		// 	// create the copy button
		// 	const copy = document.createElement("button")
		// 	copy.innerHTML = "Copy"
		// 	// add the event listener to each click
		// 	copy.addEventListener("click", handleCopyClick)
		// 	// append the copy button to each code block
		// 	div.append(copy)
		// })
	}, []);

	const lastUpdated = useMemo(() => {
		if (lastModified) {
			let date = new Date(lastModified);
			return `${date.toLocaleDateString()}, ${date.toLocaleTimeString()}`;
		}

		return null;
	}, [lastModified]);

	return (
		<div className="w-full h-full flex flex-1">
			<div className="hidden md:inline-block md:h-full md:w-64">nav</div>
			<div className="w-full h-full">
				<div
					className="markdown-body"
					dangerouslySetInnerHTML={{
						__html: marked.parse(text),
					}}
				/>

				<div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:justify-between sm:items-center">
					<a
						className="inline-flex items-center"
						href="https://github.com/aaronleopold/stump/issues/new/choose"
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className="font-medium">Help us improve this page</span>
						<ArrowSquareOut className="ml-1" />
					</a>

					{lastUpdated && (
						<p>
							<span className="font-medium">Last Updated:</span> {lastUpdated}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
