"use client"

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useParams } from 'next/navigation';

type ContentType = 'text' | 'markdown' | 'html';

type Props = {
  content: string;
  type?: ContentType;
};

export default function ContentRenderer({ content, type = 'text' }: Props) {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ja';

  const baseClasses = `content-renderer ${lang === 'ja' ? 'content-renderer-ja' : 'content-renderer-en'}`;

  switch (type) {
    case 'markdown':
      return (
        <div className={baseClasses}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeRaw]}
          >
            {content}
          </ReactMarkdown>
        </div>
      );

    case 'html':
      return (
        <div 
          className={baseClasses}
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      );

    case 'text':
    default:
      return (
        <p className={`${baseClasses} whitespace-pre-line`}>
          {content}
        </p>
      );
  }
}
