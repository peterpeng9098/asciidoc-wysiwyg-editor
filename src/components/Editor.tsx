import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Toolbar from './Toolbar';

interface EditorProps {
    initialContent?: string;
    onUpdate?: (content: string) => void;
    // We expose the editor instance so the parent can access the AST
    onEditorReady?: (editor: any) => void;
    onExport: () => void;
    onImport: () => void;
    isDirty: boolean;
}

const Editor: React.FC<EditorProps> = ({ initialContent = '', onUpdate, onEditorReady, onExport, onImport, isDirty }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => {
            if (onUpdate) {
                onUpdate(editor.getHTML());
            }
        },
    });

    // Sync the editor instance to the parent whenever it changes.
    // This handles React Strict Mode's double-mount (which destroys the first instance
    // and creates a new one), ensuring editorRef always holds the LIVE editor.
    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor]);

    return (
        <div className="bg-white border text-left border-gray-300 rounded-lg shadow-sm flex flex-col min-h-[500px]">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 rounded-t-lg">
                <Toolbar editor={editor} onExport={onExport} onImport={onImport} isDirty={isDirty} />
            </div>
            <div className="flex-1 w-full max-w-4xl mx-auto cursor-text text-gray-800 p-4 rounded-b-lg">
                <EditorContent editor={editor} className="min-h-[300px]" />
            </div>
        </div>
    );
};

export default Editor;
