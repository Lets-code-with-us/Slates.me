import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Import common programming languages
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

// Register languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('dockerfile', dockerfile);

// Language aliases for common variations
const languageAliases: { [key: string]: string } = {
  'ts': 'typescript',
  'js': 'javascript',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'cs': 'csharp',
  'sh': 'bash',
  'yml': 'yaml',
  'md': 'markdown'
};

export function highlightCode(code: string, language?: string): string {
  try {
    if (!language) {
      // Auto-detect language if not specified
      const result = hljs.highlightAuto(code);
      return result.value;
    }

    // Check for language aliases
    const actualLanguage = languageAliases[language] || language;

    // Highlight with specified language
    if (hljs.getLanguage(actualLanguage)) {
      const result = hljs.highlight(code, {
        language: actualLanguage,
        ignoreIllegals: true
      });
      return result.value;
    }

    // Fallback to auto-detection if language isn't supported
    return hljs.highlightAuto(code).value;
  } catch (e) {
    console.warn('Failed to highlight code:', e);
    return code; // Return original code if highlighting fails
  }
}