import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

const MarkdownPreview = ({ content, className = '' }) => {
    const sanitizedContent = content ? DOMPurify.sanitize(content) : '';

    return (
        <div className={`markdown-preview prose prose-lg prose-blue max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <h1 className="text-3xl font-extrabold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-800 mt-7 mb-3 pb-1 border-b border-gray-100">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-lg font-semibold text-gray-700 mt-5 mb-2">{children}</h4>,
                    p: ({ children }) => <p className="text-gray-700 leading-relaxed my-4">{children}</p>,
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all">
                            {children}
                        </a>
                    ),
                    ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 my-4 space-y-1 pl-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 my-4 space-y-1 pl-2">{children}</ol>,
                    li: ({ children }) => <li className="my-1">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 pl-4 pr-3 py-2 my-4 text-gray-600 italic rounded-r-lg">
                            {children}
                        </blockquote>
                    ),
                    code: ({ inline, className, children }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline ? (
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl my-4 overflow-x-auto text-sm shadow-inner">
                                <code className={match ? `language-${match[1]}` : ''}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => <>{children}</>,
                    hr: () => <hr className="my-8 border-gray-200" />,
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-xl border border-gray-200">
                            <table className="min-w-full text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 text-gray-600 border-b border-gray-100">
                            {children}
                        </td>
                    ),
                    img: ({ src, alt }) => (
                        <img
                            src={src}
                            alt={alt || ''}
                            className="rounded-xl shadow-md my-4 max-w-full h-auto"
                            loading="lazy"
                        />
                    ),
                    strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                    del: ({ children }) => <del className="line-through text-gray-500">{children}</del>,
                    input: ({ type, checked }) => {
                        if (type === 'checkbox') {
                            return (
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    readOnly
                                    className="mr-2 rounded border-gray-300 text-blue-600"
                                />
                            );
                        }
                        return null;
                    }
                }}
            >
                {sanitizedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownPreview;
