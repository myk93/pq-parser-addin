import { ParsedQuery } from "../types";

/**
 * Parses a Section1.m document into individual query entries.
 *
 * Format:
 *   section Section1;
 *   shared #"Query Name" = <M expression>;
 *   shared BareQuery = <M expression>;
 *
 * Uses a state machine to correctly handle:
 *  - String literals ("..." with "" as escape)
 *  - Nested brackets (), [], {}
 *  - Semicolons only at depth 0 outside strings end a shared entry
 */
export function parseSection(section1m: string): ParsedQuery[] {
    const queries: ParsedQuery[] = [];

    // Strip the "section Section1;" header
    const headerEnd = section1m.indexOf(";");
    if (headerEnd === -1) return queries;
    let pos = headerEnd + 1;

    while (pos < section1m.length) {
        // Skip whitespace
        while (pos < section1m.length && /\s/.test(section1m[pos])) pos++;
        if (pos >= section1m.length) break;

        // Look for "shared" keyword
        if (!section1m.startsWith("shared", pos)) {
            // Unexpected token — skip to next semicolon at top level
            pos = skipToTopLevelSemicolon(section1m, pos);
            if (pos === -1) break;
            pos++; // past the semicolon
            continue;
        }
        pos += 6; // past "shared"

        // Skip whitespace
        while (pos < section1m.length && /\s/.test(section1m[pos])) pos++;

        // Read query name
        let name: string;
        if (section1m[pos] === "#" && section1m[pos + 1] === '"') {
            // Quoted name: #"Name"
            pos += 2; // past #"
            let nameChars: string[] = [];
            while (pos < section1m.length) {
                if (section1m[pos] === '"') {
                    if (section1m[pos + 1] === '"') {
                        // Escaped quote
                        nameChars.push('"');
                        pos += 2;
                    } else {
                        // End of quoted name
                        pos++; // past closing "
                        break;
                    }
                } else {
                    nameChars.push(section1m[pos]);
                    pos++;
                }
            }
            name = nameChars.join("");
        } else {
            // Bare identifier: read until = or whitespace
            const start = pos;
            while (pos < section1m.length && section1m[pos] !== "=" && !/\s/.test(section1m[pos])) {
                pos++;
            }
            name = section1m.slice(start, pos);
        }

        // Skip whitespace and =
        while (pos < section1m.length && /\s/.test(section1m[pos])) pos++;
        if (section1m[pos] === "=") pos++;
        while (pos < section1m.length && /\s/.test(section1m[pos])) pos++;

        // Read formula until top-level semicolon
        const formulaStart = pos;
        pos = skipToTopLevelSemicolon(section1m, pos);
        if (pos === -1) {
            // No semicolon found — take rest of string
            const formula = section1m.slice(formulaStart).trim();
            if (name && formula) queries.push({ name, formula, dependencies: [] });
            break;
        }
        const formula = section1m.slice(formulaStart, pos).trim();
        pos++; // past semicolon

        if (name && formula) {
            queries.push({ name, formula, dependencies: [] });
        }
    }

    // Detect dependencies (cross-reference #"..." with known names)
    const nameSet = new Set(queries.map((q) => q.name));
    for (const q of queries) {
        q.dependencies = detectDependencies(q.formula, nameSet);
    }

    return queries;
}

/**
 * Scans forward from `start` to find a `;` at bracket depth 0 and outside string literals.
 * Returns the index of the semicolon, or -1 if not found.
 */
function skipToTopLevelSemicolon(text: string, start: number): number {
    let inString = false;
    let depth = 0;

    for (let i = start; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    i++; // skip escaped quote
                } else {
                    inString = false;
                }
            }
            continue;
        }

        switch (ch) {
            case '"':
                inString = true;
                break;
            case "(":
            case "[":
            case "{":
                depth++;
                break;
            case ")":
            case "]":
            case "}":
                if (depth > 0) depth--;
                break;
            case ";":
                if (depth === 0) return i;
                break;
        }
    }

    return -1;
}

/**
 * Finds all #"..." references in a formula and returns those that match known query names.
 */
function detectDependencies(formula: string, allNames: Set<string>): string[] {
    const deps: string[] = [];
    const regex = /#"([^"]*(?:""[^"]*)*)"/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
        const ref = match[1].replace(/""/g, '"');
        if (allNames.has(ref) && !deps.includes(ref)) {
            deps.push(ref);
        }
    }
    return deps;
}
