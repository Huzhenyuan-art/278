import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { PenTool, Save, ArrowLeft, Tag, Plus, X, AlertTriangle } from 'lucide-react';
import MarkdownEditor from '../components/MarkdownEditor';
import CoverImageUploader from '../components/CoverImageUploader';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

/**
 * 通用文章表单组件 - 支持创建和编辑两种模式
 * @param {Object} props
 * @param {string} props.mode - 'create' 或 'edit'
 * @param {Object} [props.initialData] - 编辑模式下的初始数据
 * @param {string} [props.articleId] - 编辑模式下的文章ID
 * @param {string} props.title - 页面标题
 * @param {string} props.subtitle - 页面副标题
 * @param {string} props.backButtonText - 返回按钮文字
 * @param {Function} props.onSubmitSuccess - 提交成功后的回调
 */
const ArticleForm = ({
    mode,
    initialData = null,
    articleId = null,
    title,
    subtitle,
    backButtonText = '返回',
    onSubmitSuccess
}) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        content: initialData?.content || '',
        status: initialData?.status || 'published',
        coverImage: initialData?.coverImage || ''
    });
    const [loading, setLoading] = useState(mode === 'edit');
    const [saving, setSaving] = useState(false);
    const [tags, setTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState(initialData?.tags?.map(t => t.id) || []);
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [creatingTag, setCreatingTag] = useState(false);
    const initialDataRef = useRef({
        title: initialData?.title || '',
        content: initialData?.content || ''
    });

    const isDirty = useMemo(() => {
        const initial = initialDataRef.current;
        if (mode === 'create') {
            return formData.title.trim() !== '' || formData.content.trim() !== '';
        }
        return formData.title !== initial.title || formData.content !== initial.content;
    }, [formData.title, formData.content, mode]);

    const { handleBackClick, showLeaveDialog, confirmLeave, cancelLeave, allowNavigation } = useUnsavedChanges(isDirty);

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const data = await HttpUtil.get('/tag');
                setTags(data);
            } catch (error) {
                console.error('Failed to fetch tags', error);
            }
        };

        if (mode === 'create') {
            fetchTags();
        }
    }, [mode]);

    useEffect(() => {
        if (mode !== 'edit' || !articleId) return;

        const fetchData = async () => {
            try {
                const [articleData, tagsData] = await Promise.all([
                    HttpUtil.get(`/article/${articleId}`),
                    HttpUtil.get('/tag')
                ]);
                const initialTitle = articleData.title;
                const initialContent = articleData.content;
                setFormData({
                    title: initialTitle,
                    content: initialContent,
                    status: articleData.status || 'published',
                    coverImage: articleData.coverImage || ''
                });
                initialDataRef.current = { title: initialTitle, content: initialContent };
                setTags(tagsData);
                if (articleData.tags && articleData.tags.length > 0) {
                    setSelectedTagIds(articleData.tags.map(t => t.id));
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
                alert('获取文章失败');
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [mode, articleId, navigate]);

    const toggleTag = (tagId) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!newTagName.trim()) return;
        setCreatingTag(true);
        try {
            const newTag = await HttpUtil.post('/tag', { name: newTagName.trim() });
            setTags(prev => [...prev, newTag]);
            setSelectedTagIds(prev => [...prev, newTag.id]);
            setNewTagName('');
            setShowTagInput(false);
        } catch (error) {
            alert('创建标签失败: ' + error.message);
        } finally {
            setCreatingTag(false);
        }
    };

    const handleSubmit = async (e, forceStatus = null) => {
        e.preventDefault();
        setSaving(true);
        try {
            const submitStatus = forceStatus || formData.status;
            const submitData = {
                ...formData,
                status: submitStatus,
                tagIds: selectedTagIds
            };

            if (mode === 'create') {
                await HttpUtil.post('/article', submitData);
            } else {
                await HttpUtil.put(`/article/${articleId}`, submitData);
                initialDataRef.current = { title: formData.title, content: formData.content };
            }

            allowNavigation();
            if (onSubmitSuccess) {
                onSubmitSuccess();
            }
        } catch (error) {
            alert('保存失败: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-[60vh]">
           <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
       </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
             <button
                onClick={() => handleBackClick(() => navigate(-1))}
                className="flex items-center text-gray-500 hover:text-gray-800 transition-colors bg-white/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200"
            >
                <ArrowLeft size={18} className="mr-1" /> {backButtonText}
            </button>

            <div className="glass rounded-3xl overflow-hidden shadow-xl border border-white/60">
                <div className="p-8 md:p-10 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-gray-100/50 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex items-center gap-4 text-gray-800">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <PenTool size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{title}</h1>
                            <p className="text-gray-500 font-medium mt-1">{subtitle}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 ml-1">文章标题</label>
                        <input
                            type="text"
                            required
                            className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 placeholder-gray-400 text-lg font-bold text-gray-800"
                            placeholder={mode === 'create' ? "给你的文章起个响亮的标题..." : "文章标题..."}
                            value={formData.title}
                            maxLength={50}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <CoverImageUploader
                        value={formData.coverImage}
                        onChange={url => setFormData({...formData, coverImage: url})}
                    />

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                            <Tag size={16} className="text-blue-500" />
                            文章标签
                        </label>
                        <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-gray-200 bg-white/50 min-h-[60px]">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                                        selectedTagIds.includes(tag.id)
                                            ? 'text-white shadow-md scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                                >
                                    {tag.name}
                                    {selectedTagIds.includes(tag.id) && (
                                        <X size={14} className="opacity-80" />
                                    )}
                                </button>
                            ))}
                            {!showTagInput ? (
                                <button
                                    type="button"
                                    onClick={() => setShowTagInput(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-dashed border-blue-300"
                                >
                                    <Plus size={14} />
                                    新建标签
                                </button>
                            ) : (
                                <form onSubmit={handleCreateTag} className="inline-flex items-center gap-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={newTagName}
                                        onChange={e => setNewTagName(e.target.value)}
                                        placeholder="输入标签名"
                                        className="px-3 py-1.5 rounded-full text-sm border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-32"
                                        onBlur={() => {
                                            if (!newTagName.trim()) setShowTagInput(false);
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={creatingTag || !newTagName.trim()}
                                        className="px-3 py-1.5 rounded-full text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        添加
                                    </button>
                                </form>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 ml-1">
                            已选择 {selectedTagIds.length} 个标签，点击标签可选中/取消
                        </p>
                    </div>

                    <div className="space-y-3 p-4 rounded-2xl border-2 border-dashed bg-blue-50/40 border-blue-200/60">
                        <label className="block text-sm font-bold text-gray-800 ml-1 flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                formData.status === 'draft'
                                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            }`}>
                                当前：{formData.status === 'draft' ? '草稿' : '已发布'}
                            </span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, status: 'published'})}
                                className={`px-4 py-3 rounded-xl font-bold transition-all duration-200 border-2 ${
                                    formData.status === 'published'
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                                }`}
                            >
                                已发布
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, status: 'draft'})}
                                className={`px-4 py-3 rounded-xl font-bold transition-all duration-200 border-2 ${
                                    formData.status === 'draft'
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                                }`}
                            >
                                存为草稿
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 ml-1 mt-1">
                            💡 「草稿」状态的文章仅您自己可见，「已发布」则所有人可见
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 ml-1">内容详情</label>
                        <MarkdownEditor
                            value={formData.content}
                            onChange={val => setFormData({...formData, content: val})}
                            placeholder={mode === 'create'
                                ? "# 开始写作吧！&#10;&#10;支持 **Markdown** 语法，例如：&#10;- 列表项&#10;- `行内代码`&#10;```js&#10;// 代码块&#10;console.log('Hello');&#10;```"
                                : "# 开始写作吧！"
                            }
                        />
                    </div>

                    <div className={`flex justify-end pt-4 border-t border-gray-100/50 ${mode === 'create' ? 'gap-3' : ''}`}>
                        {mode === 'create' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, 'draft')}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3.5 bg-white text-amber-600 font-bold rounded-2xl border-2 border-amber-200 hover:bg-amber-50 hover:border-amber-300 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            保存草稿
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, 'published')}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            发布中...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            立即发布
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        正在保存...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        保存修改
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {showLeaveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 backdrop-filter backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full transform transition-all">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 rounded-full text-amber-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">离开页面</h3>
                            </div>

                            <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                您有未保存的更改，确定要离开吗？离开后您的编辑内容将会丢失。
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelLeave}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    继续编辑
                                </button>
                                <button
                                    onClick={confirmLeave}
                                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-colors"
                                >
                                    确认离开
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleForm;
