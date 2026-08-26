'use client';

import katex from 'katex';

const FORMULA_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

export function MathText({ className, value }: { className?: string; value: string }) {
  const parts = value.split(FORMULA_PATTERN);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const displayMode = part.startsWith('$$') && part.endsWith('$$');
        const inline = part.startsWith('$') && part.endsWith('$');
        if (!displayMode && !inline) return <span key={index}>{part}</span>;
        const formula = part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1);
        try {
          return (
            <span
              className={displayMode ? 'my-2 block overflow-x-auto py-1' : 'inline-block max-w-full overflow-x-auto align-middle'}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(formula, {
                  displayMode,
                  output: 'htmlAndMathml',
                  strict: 'warn',
                  throwOnError: false,
                }),
              }}
              key={index}
            />
          );
        } catch {
          return <code className="text-red-700" key={index}>{part}</code>;
        }
      })}
    </span>
  );
}
