import React, { useState, useRef } from 'react';
import MarkdownPreview from './MarkdownPreview';
import { Eye, Edit3, Code, HelpCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { HttpUtil } from '../utils/HttpUtil';

const MarkdownEditor = ({ value, onChange, placeholder = '在这里用 Markdown 编写内容...', rows = 15 }) => {
    const [viewMode, setViewMode] = useState('split');
    const [uploadingImage, setUploadingImage] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

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

    const insertAtCursor = (text) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            onChange(value + text);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);
        onChange(newValue);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + text.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB');
            return;
        }

        setUploadingImage(true);
        try {
            const result = await HttpUtil.uploadContentImage(file);
            const imageMarkdown = `\n![${file.name}](${result.url})\n`;
            insertAtCursor(imageMarkdown);
        } catch (err) {
            alert('图片上传失败: ' + (err.message || '未知错误'));
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleImageClick = () => {
        if (!uploadingImage) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {renderToolbarButton('edit', <Edit3 size={16} />, '编辑')}
                    {renderToolbarButton('split', <Code size={16} />, '分栏')}
                    {renderToolbarButton('preview', <Eye size={16} />, '预览')}
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <button
                        type="button"
                        onClick={handleImageClick}
                        disabled={uploadingImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-white/60 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-200 disabled:opacity-50"
                    >
                        {uploadingImage ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <ImageIcon size={16} />
                        )}
                        <span className="hidden sm:inline">上传图片</span>
                    </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <HelpCircle size={14} />
                    <span>支持标准 Markdown 语法（标题、列表、代码块、表格等）</span>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                onChange={handleImageUpload}
                className="hidden"
            />

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
                            ref={textareaRef}
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
