import { createElement } from 'react';
import type { SafeContent } from './fixture-publication-content';

function render(nodes: SafeContent[]): React.ReactNode {
  return nodes.map((node, key) => {
    if (typeof node === 'string') return node;
    const children = render(node.children);
    if (node.tag === 'a') return node.href ? <a key={key} href={node.href} rel="noopener noreferrer" {...(node.href.startsWith('https:') ? { target: '_blank' } : {})}>{children}</a> : <span key={key}>{children}</span>;
    return createElement(node.tag, { key }, node.tag === 'br' || node.tag === 'hr' ? undefined : children);
  });
}

export function PublishedDocumentRenderer({ nodes }: { nodes: SafeContent[] }) {
  return <article className="publication-content">{render(nodes)}</article>;
}
