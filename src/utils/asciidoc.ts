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
    // Ensure we don't have double hashes or invalid class names if the above replacement kept the hash
    cleanedHtml = cleanedHtml.replace(/color-#/g, 'color-').replace(/bg-#/g, 'bg-');

    // Use DOMParser to safely update span classes to inline styles for Tiptap
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtml, 'text/html');

    // Map of standard AsciiDoc color roles to CSS values
    const colorMap: { [key: string]: string } = {
        'black': '#000000',
        'white': '#FFFFFF',
        'red': '#FF0000',
        'lime': '#00FF00',
        'green': '#008000',
        'blue': '#0000FF',
        'yellow': '#FFFF00',
        'orange': '#FFA500',
        'purple': '#800080',
        'gray': '#808080',
        'silver': '#C0C0C0',
        'navy': '#000080',
        'aqua': '#00FFFF',
        'teal': '#008080',
        'fuchsia': '#FF00FF',
        'maroon': '#800000',
        'olive': '#808000'
    };

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
            } else if (cls.endsWith('-background')) {
                // Handle standard background roles like .yellow-background
                const colorName = cls.replace('-background', '');
                if (colorMap[colorName]) {
                    hasMark = true;
                    markColor = colorMap[colorName];
                    span.classList.remove(cls);
                }
            } else if (colorMap[cls]) {
                // Handle standard color roles like .red, .blue
                span.style.color = colorMap[cls];
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
    let hasChanges = true;
    
    while (hasChanges && divs.length > 0) {
        hasChanges = false;
        divs.forEach(div => {
            // Keep divs that are inside table cells
            if (div.closest('td, th')) return;
            
            const parent = div.parentNode;
            if (!parent) return;
            
            while (div.firstChild) {
                parent.insertBefore(div.firstChild, div);
            }
            parent.removeChild(div);
            hasChanges = true;
        });
        
        if (hasChanges) {
             divs = Array.from(doc.body.querySelectorAll('div'));
        }
    }

    // Remove empty <p> elements (including whitespace-only ones) that Asciidoctor might leave behind
    doc.body.querySelectorAll('p').forEach(p => {
        if (!p.textContent || p.textContent.trim() === '') {
            p.remove();
        }
    });

    // Remove empty divs that might be left over
    doc.body.querySelectorAll('div').forEach(div => {
        if (!div.hasChildNodes()) {
            div.remove();
        }
    });

    // Unwrap paragraphs inside list items if they are the only content
    // This forces "tight" list rendering in many editors by removing the <p> tag's margin
    doc.body.querySelectorAll('li > p').forEach(p => {
        const li = p.parentNode;
        // Check if p is the only element child (ignoring text nodes unless they are significant?)
        // Actually, we want to unwrap if it's just a simple list item.
        // But if there are multiple paragraphs, we should keep them.
        // Let's be safe: if the LI has only ONE child element and it is this P, unwrap it.
        // We also need to be careful about nested lists which might be siblings of the P.
        
        // Count element children of the parent LI
        const children = Array.from(li?.children || []);
        const otherElements = children.filter(c => c !== p && !['UL', 'OL'].includes(c.tagName));
        
        if (li && otherElements.length === 0) {
            // Check if there are significant text nodes? Asciidoctor usually puts everything in P or not.
            
            // Move all child nodes of P to LI, before the P
            while (p.firstChild) {
                li.insertBefore(p.firstChild, p);
            }
            p.remove();
        }
    });

    // Remove text nodes that are just whitespace inside LIs (before/after nested lists or text)
    // This is crucial because Asciidoctor adds newlines that Tiptap might interpret as content
    doc.body.querySelectorAll('li').forEach(li => {
        Array.from(li.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '') {
                 li.removeChild(node);
            }
        });
    });
    
    let html = doc.body.innerHTML;
    
    // Normalize whitespace between block-level elements to prevent extra spacing
    // We target newlines and spaces between closing and opening tags of block elements
    // This is safer than a global replace which might eat space between spans
    html = html.replace(/(<\/p>|<\/ul>|<\/ol>|<\/li>|<\/h[1-6]>|<\/div>|<\/table>)\s+(<p|<ul|<ol|<li|<h[1-6]|<div|<table)/g, '$1$2');

    // Also remove whitespace immediately after opening tags of block elements if followed by text
    // e.g. <li>\nText -> <li>Text
    html = html.replace(/(<li[^>]*>)\s+/g, '$1');
    html = html.replace(/\s+(<\/li>)/g, '$1');

    return html;
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
        if (!listItem.content) return '';
        
        let result = `${marker} `;
        
        listItem.content.forEach((child: any, index: number) => {
            const isList = child.type === 'bulletList' || child.type === 'orderedList';
            
            if (index > 0) {
                 // specific check: if previous was paragraph and this is paragraph -> use +
                 // if this is list -> just newline
                 const prev = listItem.content[index-1];
                 const prevIsList = prev.type === 'bulletList' || prev.type === 'orderedList';
                 
                 if (!isList && !prevIsList) {
                     result += '\n+\n';
                 } else {
                     result += '\n';
                 }
            }
            
            if (child.type === 'paragraph') {
                result += processMarks(child);
            } else if (child.type === 'bulletList') {
                // If the parent is a bullet list, extend the marker (e.g. * -> **)
                // If the parent is an ordered list, reset to * (AsciiDoc handles mixed lists by context)
                let childMarker = '*';
                if (marker.startsWith('*')) {
                     childMarker = marker + '*';
                }
                // If we are deep in an ordered list (e.g. ..) and switch to bullet, start at *
                
                result += processList(child, childMarker);
            } else if (child.type === 'orderedList') {
                let childMarker = '.';
                if (marker.startsWith('.')) {
                     childMarker = marker + '.';
                }
                result += processList(child, childMarker);
            } else {
                result += processNode(child);
            }
        });
        
        return result;
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
                // User prefers simple syntax like [green]##text## if possible.
                // We map common HEX colors to names, or use pass:[...] for custom HEX.
                
                const colorMap: { [key: string]: string } = {
                    '#000000': 'black',
                    '#FFFFFF': 'white',
                    '#FF0000': 'red',
                    '#00FF00': 'lime', // Standard CSS lime is #00FF00
                    '#008000': 'green',
                    '#0000FF': 'blue',
                    '#FFFF00': 'yellow',
                    '#FFA500': 'orange',
                    '#800080': 'purple',
                    '#808080': 'gray',
                    '#C0C0C0': 'silver',
                    '#000080': 'navy',
                    '#00FFFF': 'aqua',
                    '#008080': 'teal',
                    '#FF00FF': 'fuchsia',
                    '#800000': 'maroon',
                    '#808000': 'olive'
                };
                
                // Helper to find closest color or exact match? Exact match is safer.
                // Tiptap often uses standard palette.
                
                let colorName = '';
                if (color && colorMap[color.toUpperCase()]) {
                    colorName = colorMap[color.toUpperCase()];
                }
                
                let bgColorName = '';
                if (bgColor && colorMap[bgColor.toUpperCase()]) {
                    bgColorName = colorMap[bgColor.toUpperCase()];
                }
                
                // Determine if we can use standard AsciiDoc role syntax
                // We can use it if we have at least one standard color and NO custom colors that would require inline styles
                const hasCustomColor = color && !colorName;
                const hasCustomBg = bgColor && !bgColorName;
                
                if (!hasCustomColor && !hasCustomBg && (colorName || bgColorName)) {
                    // Use standard role syntax: [color]##text## or [color-background]##text##
                    // User requested [yellow-background]##text## which is cleaner
                    
                    const roles: string[] = [];
                    if (colorName) roles.push(colorName);
                    if (bgColorName) roles.push(`${bgColorName}-background`);
                    
                    // Join roles.
                    const roleString = roles.join(' ');
                    text = `[${roleString}]##${text}##`;
                    
                } else {
                    // Fallback to HTML passthrough for custom HEX or mixed cases
                    let styleAttr = '';
                    if (color) styleAttr += `color:${color};`;
                    if (bgColor) styleAttr += `background-color:${bgColor};`;
                    
                    if (styleAttr) {
                        text = `pass:[<span style="${styleAttr}">${text}</span>]`;
                    }
                }

                if (isStrike) {
                     text = `[line-through]#${text}#`;
                }

                if (isBold) text = `**${text}**`;
                if (isItalic) text = `__${text}__`;
            }
            return text;
        }
        return '';
    }).join('');
};
