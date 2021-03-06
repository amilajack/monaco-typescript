/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {Language, createTokenizationSupport} from './tokenization';
import {WorkerManager} from './workerManager';
import {TypeScriptWorker} from './worker';
import {LanguageServiceDefaultsImpl} from './monaco.contribution';
import * as languageFeatures from './languageFeatures';

import Promise = monaco.Promise;
import Uri = monaco.Uri;

let javaScriptWorker: (first: Uri, ...more: Uri[]) => Promise<TypeScriptWorker>;
let typeScriptWorker: (first: Uri, ...more: Uri[]) => Promise<TypeScriptWorker>;

export function setupTypeScript(defaults:LanguageServiceDefaultsImpl): void {
	typeScriptWorker = setupMode(
		defaults,
		'typescript',
		Language.TypeScript
	);
}

export function setupJavaScript(defaults:LanguageServiceDefaultsImpl): void {
	javaScriptWorker = setupMode(
		defaults,
		'javascript',
		Language.EcmaScript5
	);
}

export function getJavaScriptWorker(): Promise<(first: Uri, ...more: Uri[]) => Promise<TypeScriptWorker>> {
	return new monaco.Promise((resolve, reject) => {
		if (!javaScriptWorker) {
			return reject("JavaScript not registered!");
		}

		resolve(javaScriptWorker);
	});
}

export function getTypeScriptWorker(): Promise<(first: Uri, ...more: Uri[]) => Promise<TypeScriptWorker>> {
	return new monaco.Promise((resolve, reject) => {
		if (!typeScriptWorker) {
			return reject("TypeScript not registered!");
		}

		resolve(typeScriptWorker);
	});
}

function setupMode(defaults:LanguageServiceDefaultsImpl, modeId:string, language:Language): (first: Uri, ...more: Uri[]) => Promise<TypeScriptWorker> {

	const client = new WorkerManager(modeId, defaults);
	const worker = (first: Uri, ...more: Uri[]): Promise<TypeScriptWorker> => {
		return client.getLanguageServiceWorker(...[first].concat(more));
	};

	monaco.languages.registerCompletionItemProvider(modeId, new languageFeatures.SuggestAdapter(worker));
	monaco.languages.registerSignatureHelpProvider(modeId, new languageFeatures.SignatureHelpAdapter(worker));
	monaco.languages.registerHoverProvider(modeId, new languageFeatures.QuickInfoAdapter(worker));
	monaco.languages.registerDocumentHighlightProvider(modeId, new languageFeatures.OccurrencesAdapter(worker));
	monaco.languages.registerDefinitionProvider(modeId, new languageFeatures.DefinitionAdapter(worker));
	monaco.languages.registerReferenceProvider(modeId, new languageFeatures.ReferenceAdapter(worker));
	monaco.languages.registerDocumentSymbolProvider(modeId, new languageFeatures.OutlineAdapter(worker));
	monaco.languages.registerDocumentRangeFormattingEditProvider(modeId, new languageFeatures.FormatAdapter(worker));
	monaco.languages.registerOnTypeFormattingEditProvider(modeId, new languageFeatures.FormatOnTypeAdapter(worker));
	new languageFeatures.DiagnostcsAdapter(defaults, modeId, worker);
	monaco.languages.setLanguageConfiguration(modeId, richEditConfiguration);
	monaco.languages.setTokensProvider(modeId, createTokenizationSupport(language));

	return worker;
}

const richEditConfiguration:monaco.languages.LanguageConfiguration = {
	wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,

	comments: {
		lineComment: '//',
		blockComment: ['/*', '*/']
	},

	brackets: [
		['{', '}'],
		['[', ']'],
		['(', ')']
	],

	onEnterRules: [
		{
			// e.g. /** | */
			beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
			afterText: /^\s*\*\/$/,
			action: { indentAction: monaco.languages.IndentAction.IndentOutdent, appendText: ' * ' }
		},
		{
			// e.g. /** ...|
			beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
			action: { indentAction: monaco.languages.IndentAction.None, appendText: ' * ' }
		},
		{
			// e.g.  * ...|
			beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
			action: { indentAction: monaco.languages.IndentAction.None, appendText: '* ' }
		},
		{
			// e.g.  */|
			beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
			action: { indentAction: monaco.languages.IndentAction.None, removeText: 1 }
		}
	],

	autoClosingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
		{ open: '"', close: '"', notIn: ['string'] },
		{ open: '\'', close: '\'', notIn: ['string', 'comment'] },
		{ open: '`', close: '`', notIn: ['string', 'comment'] },
		{ open: "/**", close: " */", notIn: ["string"] }
	]
};


