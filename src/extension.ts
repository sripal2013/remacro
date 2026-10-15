/* --------------------------------------------------------------------------------------------
 * Copyright (c) Srikanth Palutla. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A position stored relative to the cursor location where recording started.
 * Replaying anchors these deltas at the current cursor, so a macro recorded
 * on line 5 replays correctly when the cursor is on line 50.
 */
interface PositionDelta {
	line: number;
	character: number;
}

interface EditStep {
	kind: 'edit';
	start: PositionDelta;
	end: PositionDelta;
	text: string;
}

interface SelectionStep {
	kind: 'selection';
	anchor: PositionDelta;
	active: PositionDelta;
}

type MacroStep = EditStep | SelectionStep;

interface Macro {
	name: string;
	steps: MacroStep[];
	createdAt: number;
}

const MACROS_KEY = 'remacro.macros';
const LAST_MACRO_KEY = 'remacro.lastMacro';

// ---------------------------------------------------------------------------
// Recorder
// ---------------------------------------------------------------------------

function selectionKey(selection: vscode.Selection): string {
	return `${selection.anchor.line}:${selection.anchor.character}-${selection.active.line}:${selection.active.character}`;
}

class MacroRecorder {
	private steps: MacroStep[] = [];
	private anchor: vscode.Position | null = null;
	private disposables: vscode.Disposable[] = [];
	private lastSelectionKey: string | null = null;
	private active = false;

	get isRecording(): boolean {
		return this.active;
	}

	start(): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error('ReMacro: open a file before recording.');
		}
		this.anchor = editor.selection.active;
		this.steps = [];
		this.lastSelectionKey = selectionKey(editor.selection);
		this.active = true;
		this.disposables.push(
			vscode.workspace.onDidChangeTextDocument(e => this.onDidChangeTextDocument(e)),
			vscode.window.onDidChangeTextEditorSelection(e => this.onDidChangeTextEditorSelection(e))
		);
	}

	private delta(pos: vscode.Position): PositionDelta {
		const anchor = this.anchor as vscode.Position;
		return { line: pos.line - anchor.line, character: pos.character - anchor.character };
	}

	private onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent): void {
		if (!this.active) {
			return;
		}
		for (const change of e.contentChanges) {
			this.steps.push({
				kind: 'edit',
				start: this.delta(change.range.start),
				end: this.delta(change.range.end),
				text: change.text
			});
		}
	}

	private onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent): void {
		if (!this.active || e.selections.length === 0) {
			return;
		}
		const key = selectionKey(e.selections[0]);
		if (key === this.lastSelectionKey) {
			return;
		}
		this.lastSelectionKey = key;
		this.steps.push({
			kind: 'selection',
			anchor: this.delta(e.selections[0].anchor),
			active: this.delta(e.selections[0].active)
		});
	}

	stop(): MacroStep[] {
		this.active = false;
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
		return this.steps;
	}
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

function resolvePosition(document: vscode.TextDocument, anchor: vscode.Position, delta: PositionDelta): vscode.Position {
	const line = Math.min(Math.max(0, anchor.line + delta.line), document.lineCount - 1);
	const maxCharacter = document.lineAt(line).text.length;
	const character = Math.min(Math.max(0, anchor.character + delta.character), maxCharacter);
	return new vscode.Position(line, character);
}

async function playSteps(document: vscode.TextDocument, editor: vscode.TextEditor, steps: MacroStep[]): Promise<void> {
	const anchor = editor.selection.active;
	for (const step of steps) {
		if (step.kind === 'selection') {
			editor.selection = new vscode.Selection(
				resolvePosition(document, anchor, step.anchor),
				resolvePosition(document, anchor, step.active)
			);
		} else {
			const range = new vscode.Range(
				resolvePosition(document, anchor, step.start),
				resolvePosition(document, anchor, step.end)
			);
			const applied = await editor.edit(editBuilder => {
				editBuilder.replace(range, step.text);
			});
			if (!applied) {
				throw new Error('a replay edit could not be applied.');
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function getMacros(context: vscode.ExtensionContext): Macro[] {
	return context.globalState.get<Macro[]>(MACROS_KEY, []);
}

async function saveMacro(context: vscode.ExtensionContext, macro: Macro): Promise<void> {
	const macros = getMacros(context).filter(m => m.name !== macro.name);
	macros.push(macro);
	await context.globalState.update(MACROS_KEY, macros);
	await context.globalState.update(LAST_MACRO_KEY, macro.name);
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
	const recorder = new MacroRecorder();

	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = '$(record) Recording macro';
	statusBar.tooltip = 'ReMacro is recording — click to stop';
	statusBar.command = 'remacro.stopRecording';

	async function playMacro(macro: Macro): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('ReMacro: open a file to replay into.');
			return;
		}
		try {
			await playSteps(editor.document, editor, macro.steps);
		} catch (err) {
			vscode.window.showErrorMessage(`ReMacro: replay failed — ${(err as Error).message}`);
		}
	}

	const startRecording = vscode.commands.registerCommand('remacro.startRecording', () => {
		if (recorder.isRecording) {
			vscode.window.showInformationMessage('ReMacro: already recording.');
			return;
		}
		try {
			recorder.start();
		} catch (err) {
			vscode.window.showErrorMessage((err as Error).message);
			return;
		}
		statusBar.show();
		vscode.window.showInformationMessage('ReMacro: recording started.');
	});

	const stopRecording = vscode.commands.registerCommand('remacro.stopRecording', async (args?: { name?: string }) => {
		if (!recorder.isRecording) {
			return;
		}
		statusBar.hide();
		const steps = recorder.stop();
		if (steps.length === 0) {
			vscode.window.showInformationMessage('ReMacro: nothing was recorded.');
			return;
		}
		let name = args?.name;
		if (!name) {
			name = await vscode.window.showInputBox({
				prompt: 'Name this macro (empty discards it)',
				placeHolder: 'my-macro'
			});
		}
		if (!name) {
			vscode.window.showInformationMessage('ReMacro: macro discarded.');
			return;
		}
		await saveMacro(context, { name, steps, createdAt: Date.now() });
		vscode.window.showInformationMessage(`ReMacro: saved "${name}" (${steps.length} steps).`);
	});

	const playLastMacro = vscode.commands.registerCommand('remacro.playLastMacro', async () => {
		const name = context.globalState.get<string>(LAST_MACRO_KEY);
		const macro = getMacros(context).find(m => m.name === name);
		if (!macro) {
			vscode.window.showInformationMessage('ReMacro: no macro recorded yet.');
			return;
		}
		await playMacro(macro);
	});

	const runMacro = vscode.commands.registerCommand('remacro.runMacro', async (args?: { name?: string }) => {
		let macro: Macro | undefined;
		if (args?.name) {
			macro = getMacros(context).find(m => m.name === args.name);
		} else {
			const macros = getMacros(context);
			if (macros.length === 0) {
				vscode.window.showInformationMessage('ReMacro: no saved macros.');
				return;
			}
			const picked = await vscode.window.showQuickPick(
				macros.map(m => m.name),
				{ placeHolder: 'Run macro' }
			);
			macro = macros.find(m => m.name === picked);
		}
		if (!macro) {
			vscode.window.showErrorMessage('ReMacro: macro not found.');
			return;
		}
		await playMacro(macro);
	});

	const deleteMacro = vscode.commands.registerCommand('remacro.deleteMacro', async () => {
		const macros = getMacros(context);
		if (macros.length === 0) {
			vscode.window.showInformationMessage('ReMacro: no saved macros.');
			return;
		}
		const picked = await vscode.window.showQuickPick(
			macros.map(m => m.name),
			{ placeHolder: 'Delete macro' }
		);
		if (!picked) {
			return;
		}
		await context.globalState.update(MACROS_KEY, macros.filter(m => m.name !== picked));
		vscode.window.showInformationMessage(`ReMacro: deleted "${picked}".`);
	});

	context.subscriptions.push(startRecording, stopRecording, playLastMacro, runMacro, deleteMacro, statusBar);
}

export function deactivate(): void {
	// Nothing to clean up: the recorder disposes its listeners on stop.
}
