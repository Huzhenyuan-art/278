import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { PenTool, Save, ArrowLeft, Sparkles, Tag, Plus, X } from 'lucide-react';

const ArticleCreate = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [creatingTag, setCreatingTag] = useState(false);

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const data = await HttpUtil.get('/tag');
                setTags(data);
            } catch (error) {
                console.error('Failed to fetch tags', error);
            }
        };
        fetchTags();
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await HttpUtil.post('/article', {
                ...formData,
                tagIds: selectedTagIds
            });
            navigate('/');
        } catch (error) {
            alert('发布失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <button 
                onClick={() => navigate(-1)} 
                className="flex items-center text-gray-500 hover:text-gray-800 transition-colors bg-white/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200"
            >
                <ArrowLeft size={18} className="mr-1" /> 返回
            </button>

            <div className="glass rounded-3xl overflow-hidden shadow-xl border border-white/60">
                <div className="p-8 md:p-10 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-gray-100/50 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex items-center gap-4 text-gray-800">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <PenTool size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">发布新文章</h1>
                            <p className="text-gray-500 font-medium mt-1">分享你的技术见解与实战经验</p>
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
                            placeholder="给你的文章起个响亮的标题..."
                            value={formData.title}
                            maxLength={20}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    
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

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 ml-1">内容详情</label>
                        <textarea
                            required
                            rows="15"
                            className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 placeholder-gray-400 resize-none font-sans text-gray-700 leading-relaxed"
                            placeholder="在此处分享你的真知灼见 (支持 Markdown 格式)..."
                            value={formData.content}
                            onChange={e => setFormData({...formData, content: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100/50">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            {loading ? (
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
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ArticleCreate;
