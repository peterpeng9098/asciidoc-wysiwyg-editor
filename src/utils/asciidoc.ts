import Asciidoctor from 'asciidoctor';

const asciidoctor = Asciidoctor();

// ----------------------------------------------------
// IMPORT: Parse AsciiDoc to HTML for Tiptap
// ----------------------------------------------------
export const parseAsciiDocToHtml = (adocContent: string): string => {
    // Asciidoctor returns HTML that we can feed directly into Tiptap
    const rawHtml = asciidoctor.convert(adocContent, { safe: 'server', attributes: { showtitle: true } }) as string;

    // Asciidoctor applies typographic substitutions (e.g. `...` → `…`, `--` → `—`).
    // Normalize these back to ASCII equivalents to keep the export idempotent.
    const normalized = rawHtml
        .replace(/\u2026/g, '...')    // Ellipsis → three dots
        .replace(/\u2014/g, '--')     // Em dash → double hyphen
        .replace(/\u2013/g, '-')      // En dash → single hyphen
        .replace(/\u2019/g, "'")      // Right single quote → apostrophe
        .replace(/\u2018/g, "'")      // Left single quote → apostrophe
        .replace(/\u201C/g, '"')      // Left double quote
        .replace(/\u201D/g, '"');     // Right double quote

    // Pre-clean legacy invalid syntaxes from earlier versions (e.g. class="color="#FF0000"")
    let cleanedHtml = normalized.replace(/class="color=(?:&quot;|")?(#[a-fA-F0-9]+)(?:&quot;|")?"?/g, 'class="color-$1"');
    cleanedHtml = cleanedHtml.replace(/class="background-color=(?:&quot;|")?(#[a-fA-F0-9]+)(?:&quot;|")?"?/g, 'class="bg-$1"');
    cleanedHtml = cleanedHtml.replace(/color-#/g, 'color-').replace(/bg-#/g, 'bg-');

    // Use DOMParser to safely update span classes to inline styles for Tiptap
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtml, 'text/html');

    doc.querySelectorAll('span').forEach(span => {
        let hasMark = false;
        let markColor = '';

        const classNames = Array.from(span.classList);
        classNames.forEach(cls => {
            if (cls.startsWith('color-')) {
                const hex = '#' + cls.replace('color-', '');
                span.style.color = hex;
                span.classList.remove(cls);
            } else if (cls.startsWith('bg-')) {
                const hex = '#' + cls.replace('bg-', '');
                hasMark = true;
                markColor = hex;
                span.classList.remove(cls);
            }
        });

        if (hasMark) {
            const mark = document.createElement('mark');
            mark.setAttribute('data-color', markColor);
            mark.style.backgroundColor = markColor;
            mark.style.color = 'inherit';

            if (span.classList.length === 0 && !span.style.color) {
                mark.innerHTML = span.innerHTML;
                span.replaceWith(mark);
            } else {
                mark.innerHTML = span.innerHTML;
                span.innerHTML = '';
                span.appendChild(mark);
            }
        }
    });

    doc.querySelectorAll('[class=""]').forEach(el => el.removeAttribute('class'));

    // Aggressively flatten all <div> containers (we only care about <p>, <h*>, <ul>, <ol>, <table>).
    // Loop until no more divs remain outside of tables so we handle any nesting depth.
    let divs = Array.from(doc.body.querySelectorAll('div'));
    while (divs.length > 0) {
        divs.forEach(div => {
            // Keep divs that are inside table cells
            if (div.closest('td, th')) return;
            const parent = div.parentNode;
            if (!parent) return;
            while (div.firstChild) {
                parent.insertBefore(div.firstChild, div);
            }
            parent.removeChild(div);
        });
        divs = Array.from(doc.body.querySelectorAll('div'));
    }

    // Remove empty <p> elements (including whitespace-only ones) that Asciidoctor might leave behind
    doc.body.querySelectorAll('p').forEach(p => {
        if (!p.textContent || p.textContent.trim() === '') {
            p.remove();
        }
    });

    // Remove whitespace-only text nodes directly under body
    Array.from(doc.body.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '') {
            doc.body.removeChild(node);
        }
    });

    return doc.body.innerHTML;
};

// Helper to convert browser-normalized rgb(r, g, b) back to #RRGGBB hex
const rgbToHex = (color: string): string => {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }
    return color;
};

// ----------------------------------------------------
// EXPORT: Serialize Tiptap JSON AST to AsciiDoc String
// ----------------------------------------------------
export const serializeTiptapToAsciiDoc = (ast: any): string => {
    if (!ast || !ast.content) return '';

    return ast.content
        .map((node: any) => processNode(node))
        .filter((text: string) => text.trim() !== '') // Skip empty paragraphs -> no extra blank lines
        .join('\n\n');
};

const processNode = (node: any): string => {
    switch (node.type) {
        case 'heading':
            return `${'='.repeat(node.attrs.level)} ${processMarks(node)}`;

        case 'paragraph':
            return processMarks(node);

        case 'bulletList':
            return processList(node, '*');

        case 'orderedList':
            return processList(node, '.');

        case 'table':
            return processTable(node);

        default:
            console.warn(`Unsupported node type: ${node.type}`);
            return processMarks(node);
    }
};

const processList = (listNode: any, marker: string): string => {
    if (!listNode.content) return '';
    return listNode.content.map((listItem: any) => {
        // A list item usually contains a paragraph
        const p = listItem.content?.[0];
        const text = p ? processMarks(p) : '';
        return `${marker} ${text}`;
    }).join('\n');
};

const processTable = (tableNode: any): string => {
    let tableAdoc = '|===\n';

    if (!tableNode.content) return tableAdoc + '|===';

    tableNode.content.forEach((row: any) => {
        if (!row.content) return;
        tableAdoc += row.content.map((cell: any) => {
            const p = cell.content?.[0];
            const text = p ? processMarks(p) : '';
            return `| ${text}`;
        }).join(' ') + '\n';
    });

    tableAdoc += '|===\n';
    return tableAdoc;
};

// Helper to concatenate text and apply marks (bold, italic, color, highlight, strike)
const processMarks = (node: any): string => {
    if (!node.content) return '';

    return node.content.map((textNode: any) => {
        if (textNode.type === 'text') {
            let text = textNode.text;

            if (textNode.marks) {
                let isBold = false;
                let isItalic = false;
                let isStrike = false;
                let color = '';
                let bgColor = '';

                textNode.marks.forEach((mark: any) => {
                    if (mark.type === 'bold') isBold = true;
                    if (mark.type === 'italic') isItalic = true;
                    if (mark.type === 'strike') isStrike = true;
                    if (mark.type === 'textStyle' && mark.attrs.color) color = rgbToHex(mark.attrs.color);
                    if (mark.type === 'highlight' && mark.attrs.color) bgColor = rgbToHex(mark.attrs.color);
                });

                // In AsciiDoc, you can combine multiple roles like [.role1.role2]#text#
                let roles: string[] = [];
                if (isStrike) roles.push('line-through');
                if (color) roles.push(`color-${color.replace('#', '')}`);
                if (bgColor) roles.push(`bg-${bgColor.replace('#', '')}`);

                if (roles.length > 0) {
                    text = `[.${roles.join('.')}]##${text}##`;
                }

                // Wrap with bold/italic last (outermost) using unconstrained formatting
                if (isBold) text = `**${text}**`;
                if (isItalic) text = `__${text}__`;
            }
            return text;
        }
        return '';
    }).join('');
};
