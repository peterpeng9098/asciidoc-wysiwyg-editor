import React, { useState } from 'react';
import { type Editor } from '@tiptap/react';
import {
    Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
    Bold, Italic, Strikethrough, List, ListOrdered,
    Table as TableIcon, PaintBucket, Highlighter,
    FileUp, FileDown
} from 'lucide-react';

interface ToolbarProps {
    editor: Editor | null;
    onExport: () => void;
    onImport: () => void;
    isDirty: boolean;
}

const STANDARD_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Silver', value: '#C0C0C0' },
    { name: 'Gray', value: '#808080' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Maroon', value: '#800000' },
    { name: 'Red', value: '#FF0000' },
    { name: 'Purple', value: '#800080' },
    { name: 'Fuchsia', value: '#FF00FF' },
    { name: 'Green', value: '#008000' },
    { name: 'Lime', value: '#00FF00' },
    { name: 'Olive', value: '#808000' },
    { name: 'Yellow', value: '#FFFF00' },
    { name: 'Navy', value: '#000080' },
    { name: 'Blue', value: '#0000FF' },
    { name: 'Teal', value: '#008080' },
    { name: 'Aqua', value: '#00FFFF' }
];

const Toolbar: React.FC<ToolbarProps> = ({ editor, onExport, onImport, isDirty }) => {
    if (!editor) {
        return null;
    }

    const toggleHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
        editor.chain().focus().toggleHeading({ level }).run();
    };

    const setTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
        editor.chain().focus().setColor(e.target.value).run();
    };

    const setHighlight = (e: React.ChangeEvent<HTMLInputElement>) => {
        editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
    };

    const [showTableDialog, setShowTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    const insertTable = () => {
        setShowTableDialog(true);
    };

    const confirmInsertTable = () => {
        const rows = Math.max(1, Math.min(20, tableRows));
        const cols = Math.max(1, Math.min(20, tableCols));
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        setShowTableDialog(false);
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
            {/* File Operations */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                <button
                    onClick={onImport}
                    className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700"
                    title="Import File"
                >
                    <FileUp size={18} />
                </button>
                <button
                    onClick={onExport}
                    className={`p-1.5 rounded transition-colors ${isDirty ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-gray-700 hover:bg-gray-200'}`}
                    title={isDirty ? "Unsaved changes" : "Export to AsciiDoc"}
                >
                    <FileDown size={18} />
                </button>
            </div>

            {/* Headings */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                {[
                    { level: 1, icon: Heading1 },
                    { level: 2, icon: Heading2 },
                    { level: 3, icon: Heading3 },
                    { level: 4, icon: Heading4 },
                    { level: 5, icon: Heading5 },
                    { level: 6, icon: Heading6 },
                ].map(({ level, icon: Icon }) => (
                    <button
                        key={level}
                        onClick={() => toggleHeading(level as any)}
                        className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level }) ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                        title={`Heading ${level}`}
                    >
                        <Icon size={18} />
                    </button>
                ))}
            </div>

            {/* Formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                    title="Bold"
                >
                    <Bold size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                    title="Italic"
                >
                    <Italic size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                    title="Strikethrough"
                >
                    <Strikethrough size={18} />
                </button>
            </div>

            {/* Lists */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                    title="Bullet List"
                >
                    <List size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                    title="Ordered List"
                >
                    <ListOrdered size={18} />
                </button>
            </div>

            {/* Colors & Styles */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-2 mr-1 relative">
                {/* Text Color Dropdown */}
                <div className="relative group">
                    <button className="flex items-center p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700" title="Text Color">
                        <PaintBucket size={16} />
                    </button>
                    <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50 w-48">
                        <div className="bg-white border border-gray-200 shadow-xl rounded-md p-2">
                            <div className="text-xs text-gray-500 mb-2 font-semibold">Standard Colors</div>
                            <div className="grid grid-cols-4 gap-1 mb-3">
                                {STANDARD_COLORS.map(color => (
                                    <button
                                        key={`text-${color.value}`}
                                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                        onClick={() => editor.chain().focus().setColor(color.value).run()}
                                    />
                                ))}
                            </div>
                            <div className="text-xs text-gray-500 mb-1 font-semibold flex justify-between items-center">
                                Custom Color
                                <input
                                    type="color"
                                    onChange={setTextColor}
                                    value={editor.getAttributes('textStyle').color || '#000000'}
                                    className="w-6 h-6 border-0 p-0 cursor-pointer rounded"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Highlight Color Dropdown */}
                <div className="relative group">
                    <button className="flex items-center p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700" title="Highlight Color">
                        <Highlighter size={16} />
                    </button>
                    <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50 w-48">
                        <div className="bg-white border border-gray-200 shadow-xl rounded-md p-2">
                            <div className="text-xs text-gray-500 mb-2 font-semibold">Standard Highlights</div>
                            <div className="grid grid-cols-4 gap-1 mb-3">
                                {STANDARD_COLORS.map(color => (
                                    <button
                                        key={`bg-${color.value}`}
                                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                        onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                                    />
                                ))}
                            </div>
                            <div className="text-xs text-gray-500 mb-1 font-semibold flex justify-between items-center">
                                Custom Highlight
                                <input
                                    type="color"
                                    onChange={setHighlight}
                                    value={editor.getAttributes('highlight').color || '#ffff00'}
                                    className="w-6 h-6 border-0 p-0 cursor-pointer rounded"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tables */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1 relative">
                <button
                    onClick={insertTable}
                    className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700"
                    title="Insert Table"
                >
                    <TableIcon size={18} />
                </button>
                {editor.isActive('table') && (
                    <div className="flex space-x-1 text-xs">
                        <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-1.5 py-1 bg-gray-200 hover:bg-gray-300 rounded">Add Col</button>
                        <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-1.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded">Del Col</button>
                        <button onClick={() => editor.chain().focus().addRowBefore().run()} className="px-1.5 py-1 bg-gray-200 hover:bg-gray-300 rounded">Add Row</button>
                        <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-1.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded">Del Row</button>
                        <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-1.5 py-1 bg-red-500 text-white hover:bg-red-600 rounded">Del Table</button>
                    </div>
                )}

                {/* Table size dialog */}
                {showTableDialog && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowTableDialog(false); }}
                    >
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-64 border border-gray-200">
                            <h3 className="text-base font-semibold text-gray-800 mb-4">Insert Table</h3>
                            <div className="flex flex-col gap-3 mb-5">
                                <label className="flex items-center justify-between text-sm text-gray-700">
                                    Rows
                                    <input
                                        type="number"
                                        min={1} max={20}
                                        value={tableRows}
                                        onChange={e => setTableRows(Number(e.target.value))}
                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </label>
                                <label className="flex items-center justify-between text-sm text-gray-700">
                                    Columns
                                    <input
                                        type="number"
                                        min={1} max={20}
                                        value={tableCols}
                                        onChange={e => setTableCols(Number(e.target.value))}
                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        onKeyDown={e => { if (e.key === 'Enter') confirmInsertTable(); if (e.key === 'Escape') setShowTableDialog(false); }}
                                    />
                                </label>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowTableDialog(false)}
                                    className="px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmInsertTable}
                                    className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Insert
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Toolbar;
