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
}

const Editor: React.FC<EditorProps> = ({ initialContent = '', onUpdate, onEditorReady }) => {
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
        <div className="bg-white border text-left border-gray-300 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            <Toolbar editor={editor} />
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto cursor-text text-gray-800">
                <EditorContent editor={editor} className="h-full" />
            </div>
        </div>
    );
};

export default Editor;
