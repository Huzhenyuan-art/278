import React, { useState } from 'react';
import MarkdownPreview from './MarkdownPreview';
import { Eye, Edit3, Code, HelpCircle } from 'lucide-react';

const MarkdownEditor = ({ value, onChange, placeholder = '在这里用 Markdown 编写内容...', rows = 15 }) => {
    const [viewMode, setViewMode] = useState('split');

    const renderToolbarButton = (mode, icon, label) => (
        <button
            type="button"
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === mode
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white/60 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-200'
            }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {renderToolbarButton('edit', <Edit3 size={16} />, '编辑')}
                    {renderToolbarButton('split', <Code size={16} />, '分栏')}
                    {renderToolbarButton('preview', <Eye size={16} />, '预览')}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <HelpCircle size={14} />
                    <span>支持标准 Markdown 语法（标题、列表、代码块、表格等）</span>
                </div>
            </div>

            <div className={`rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm ${
                viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2' : ''
            }`}>
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className={`${viewMode === 'split' ? 'border-b lg:border-b-0 lg:border-r border-gray-200' : ''}`}>
                        <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Markdown 编辑
                            </span>
                            <span className="text-xs text-gray-400">
                                {value.length} 字符
                            </span>
                        </div>
                        <textarea
                            required
                            rows={rows}
                            className="w-full h-full min-h-[400px] px-5 py-4 bg-white focus:bg-white outline-none resize-none font-mono text-sm text-gray-700 leading-relaxed placeholder-gray-400"
                            placeholder={placeholder}
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                )}

                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className="bg-white">
                        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                实时预览
                            </span>
                            <span className="text-xs text-blue-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                渲染中
                            </span>
                        </div>
                        <div className="min-h-[400px] px-5 py-4 overflow-auto bg-gray-50/30">
                            {value ? (
                                <MarkdownPreview content={value} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-gray-400">
                                    <Eye size={48} className="opacity-30 mb-3" />
                                    <p className="text-sm">开始编写后，预览将在这里显示</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <details className="text-sm">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium select-none flex items-center gap-1.5">
                    📖 Markdown 语法速查
                </summary>
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-gray-600">
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">标题</p>
                        <code className="bg-white px-2 py-1 rounded border text-gray-500"># 一级标题</code><br />
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">## 二级标题</code>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">强调</p>
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">**粗体**</code><br />
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">*斜体*</code>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">列表</p>
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">- 项目符号</code><br />
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">1. 编号列表</code>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">链接/图片</p>
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">[文字](链接)</code><br />
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">![alt](图片链接)</code>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">代码</p>
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">`行内代码`</code><br />
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">```代码块```</code>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 mb-1">其他</p>
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">{'>>>'} 引用</code><br />
                        <code className="bg-white px-2 py-1 rounded border text-gray-500">--- 分割线</code>
                    </div>
                </div>
            </details>
        </div>
    );
};

export default MarkdownEditor;
