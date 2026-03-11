import React, { useRef, useState, useEffect } from 'react';
import Editor from './components/Editor';
import { serializeTiptapToAsciiDoc, parseAsciiDocToHtml } from './utils/asciidoc';

function App() {
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [filename, setFilename] = useState<string>('document.adoc');

  // Show browser's native "Leave site?" dialog when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers show their own generic message; setting returnValue triggers it
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleExport = () => {
    const editorInstance = editorRef.current;
    if (!editorInstance) {
      console.warn("Editor not initialized or empty.");
      alert("Nothing to export!");
      return;
    }

    const json = editorInstance.getJSON();

    // Fetch the latest AST directly from the editor instance at the moment of click
    console.log("Exporting AST:", json);
    const adocString = serializeTiptapToAsciiDoc(json);

    const blob = new Blob([adocString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Mark as saved after export
    setIsDirty(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const editorInstance = editorRef.current;
    if (!file || !editorInstance) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        console.log("Read file content:", text);
        const html = parseAsciiDocToHtml(text);
        console.log("Parsed HTML:", html);

        // Save the filename for exporting later
        let originalName = file.name;
        if (!originalName.endsWith('.adoc')) {
          originalName = originalName.replace(/\.[^/.]+$/, "") + ".adoc";
        }
        setFilename(originalName);

        // Two-step approach: clearContent first then insertContent.
        // This ensures Tiptap's internal document state transitions correctly,
        // which is critical immediately after a fresh page load where setContent
        // alone may silently fail to update the editor's React view.
        setTimeout(() => {
          editorInstance.commands.clearContent(true);
          setTimeout(() => {
            editorInstance.commands.insertContent(html);
            setIsDirty(false); // Fresh load from file — not dirty yet
          }, 0);
        }, 50);
      } catch (error) {
        console.error("Error reading or parsing AsciiDoc:", error);
        alert("Failed to load AsciiDoc file. See console for details.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 px-4 font-sans text-gray-900">
      <div className="w-full max-w-5xl mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">AsciiDoc WYSIWYG Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Edit visually, export to `.adoc` instantly.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept=".adoc,.txt"
            className="hidden"
          />
        </div>
      </div>

      <div className="w-full max-w-5xl flex-1 mb-8 shadow-lg">
        <Editor
          initialContent="<h1>Welcome to the AsciiDoc Editor</h1><p>Start typing here...</p>"
          onUpdate={() => setIsDirty(true)}
          onEditorReady={(editor) => {
            editorRef.current = editor;
          }}
          onExport={handleExport}
          onImport={handleImport}
          isDirty={isDirty}
        />
      </div>
    </div>
  );
}

export default App;
