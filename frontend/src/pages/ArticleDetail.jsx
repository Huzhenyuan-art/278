import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatDate } from '../utils/dateUtils';
import { User, Calendar, ArrowLeft, Trash2, Edit, Heart, Tag } from 'lucide-react';
import Modal from '../components/Modal';
import CommentSection from '../components/CommentSection';
import MarkdownPreview from '../components/MarkdownPreview';

const ArticleDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const data = await HttpUtil.get(`/article/${id}`);
                setArticle(data);
            } catch (error) {
                console.error("Failed to fetch article", error);
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [id]);

    const handleDelete = async () => {
        try {
            await HttpUtil.delete(`/article/${id}`);
            navigate('/');
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    };

    const handleLike = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        if (isLiking) return;

        setIsLiking(true);
        try {
            const result = await HttpUtil.post(`/article/${id}/like`);
            setArticle(prev => ({
                ...prev,
                liked: result.liked,
                likeCount: result.likeCount
            }));
        } catch (error) {
            console.error("Failed to toggle like", error);
        } finally {
            setIsLiking(false);
        }
    };

    if (loading) return (
         <div className="flex justify-center items-center h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );
    if (!article) return <div className="text-center py-20 text-gray-500 font-medium">文章不存在</div>;

    const isAuthor = user && (user.id === article.authorId || user.role === 'admin');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Modal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="确认删除"
                message="确定要删除这篇文章吗？此操作将永久移除该内容，无法撤销。"
            />

            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center text-gray-500 hover:text-gray-800 transition-colors bg-white/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200"
            >
                <ArrowLeft size={18} className="mr-1" /> 返回列表
            </button>

            <article className="glass rounded-3xl overflow-hidden shadow-xl border border-white/60">
                 <div className="relative h-64 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
                    
                    <div className="relative z-10 p-10 text-center max-w-3xl">
                        <div className="flex justify-center mb-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                article.status === 'draft'
                                    ? 'bg-amber-100/80 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-100/80 text-emerald-700 border border-emerald-200'
                            }`}>
                                {article.status === 'draft' ? '草稿' : '已发布'}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
                            {article.title}
                        </h1>
                        {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {article.tags.map(tag => (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white shadow-sm"
                                        style={{ backgroundColor: tag.color }}
                                    >
                                        <Tag size={12} />
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-4 text-sm font-medium flex-wrap">
                            <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full text-blue-700 shadow-sm border border-white/50">
                                <User size={14} /> {article.user?.username}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full text-gray-600 shadow-sm border border-white/50">
                                <Calendar size={14} /> {formatDate(article.createdAt)}
                            </span>
                            <button
                                onClick={handleLike}
                                disabled={isLiking}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full shadow-sm border backdrop-blur-md transition-all ${
                                    article.liked
                                        ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100'
                                        : 'bg-white/60 border-white/50 text-gray-600 hover:bg-red-50 hover:text-red-400 hover:border-red-100'
                                } ${isLiking ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <Heart size={14} fill={article.liked ? 'currentColor' : 'none'} />
                                <span>{article.likeCount || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12 bg-white/50">
                    <MarkdownPreview content={article.content} />
                </div>

                {isAuthor && (
                    <div className="bg-gray-50/80 px-8 py-5 border-t border-gray-100 flex justify-end gap-3 backdrop-blur-md">
                         <button 
                            onClick={() => navigate(`/article/edit/${id}`)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all border border-transparent hover:border-gray-100 font-medium"
                        >
                            <Edit size={18} /> 编辑
                        </button>
                        <button 
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 hover:shadow-sm transition-all border border-transparent hover:border-red-100 font-medium"
                        >
                            <Trash2 size={18} /> 删除
                        </button>
                    </div>
                )}
            </article>

            <CommentSection articleId={article.id} />
        </div>
    );
};

export default ArticleDetail;
