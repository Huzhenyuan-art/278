import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { Clock, User as UserIcon, ArrowRight, MessageSquare, Sparkles, TrendingUp, Heart } from 'lucide-react';

const Dashboard = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [likingIds, setLikingIds] = useState(new Set());

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const data = await HttpUtil.get('/article');
                setArticles(data);
            } catch (error) {
                console.error("Failed to fetch articles", error);
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    const handleLike = async (e, articleId) => {
        e.preventDefault();
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        if (likingIds.has(articleId)) return;

        setLikingIds(prev => new Set(prev).add(articleId));
        try {
            const result = await HttpUtil.post(`/article/${articleId}/like`);
            setArticles(prev => prev.map(a =>
                a.id === articleId
                    ? { ...a, liked: result.liked, likeCount: result.likeCount }
                    : a
            ));
        } catch (error) {
            console.error("Failed to toggle like", error);
        } finally {
            setLikingIds(prev => {
                const next = new Set(prev);
                next.delete(articleId);
                return next;
            });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                 <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-b-indigo-400 rounded-full animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                 </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero Section - Reduced vertical padding (py-14 -> py-10) and refined width */}
            <header className="relative py-10 px-8 rounded-3xl overflow-hidden glass shadow-lg max-w-6xl mx-auto w-full">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-green-400/20 to-teal-400/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="relative z-10 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 mb-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest bg-blue-50/50 px-2 py-0.5 rounded-full border border-blue-100/50 backdrop-blur-md">
                        <Sparkles size={12} />
                        <span>Discover & Share</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-800 tracking-tight leading-tight mb-4">
                        探索技术前沿 <br className="hidden md:block" />
                        <span className="text-2xl md:text-4xl text-gray-500 font-bold block mt-1.5">分享你的独到见解</span>
                    </h1>
                     <p className="max-w-lg text-base text-gray-600 leading-relaxed mb-0 md:mb-0 mx-auto md:mx-0">
                        加入我们的开发者社区，阅读高质量技术文章，交流编程心得。
                    </p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <TrendingUp size={20} className="text-indigo-500" />
                        最新动态
                    </h2>
                    <span className="text-xs font-medium text-gray-500 bg-white/50 px-2.5 py-0.5 rounded-full border border-gray-100">
                        共 {articles.length} 篇文章
                    </span>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {articles.map((article) => (
                        <Link 
                            key={article.id} 
                            to={`/article/${article.id}`}
                            className="group glass-card rounded-2xl p-5 flex flex-col h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl no-underline"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-xs ring-1 ring-black/5 shadow-inner">
                                    {article.user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-700">{article.user?.username}</span>
                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(article.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1 leading-tight">
                                {article.title}
                            </h3>
                            
                            <p className="text-gray-500 mb-4 flex-grow line-clamp-3 leading-relaxed text-sm">
                                {article.content}
                            </p>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100/50 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-5px] group-hover:translate-x-0 duration-300">
                                    阅读更多 <ArrowRight size={14} />
                                </span>
                                <button
                                    onClick={(e) => handleLike(e, article.id)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${
                                        article.liked
                                            ? 'bg-red-50 text-red-500'
                                            : 'bg-gray-50/80 text-gray-400 hover:bg-red-50 hover:text-red-400'
                                    } ${likingIds.has(article.id) ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <Heart size={12} fill={article.liked ? 'currentColor' : 'none'} />
                                    <span className="text-[11px] font-medium">{article.likeCount || 0}</span>
                                </button>
                            </div>
                        </Link>
                    ))}
                </div>

                {articles.length === 0 && (
                    <div className="text-center py-20 glass rounded-3xl border border-dashed border-gray-300/50">
                        <div className="w-14 h-14 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Sparkles size={28} />
                        </div>
                        <p className="text-gray-500 text-base font-medium">暂无文章，来做第一个分享者吧！</p>
                        <Link to="/article/create" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm no-underline">
                            <Sparkles size={16} />
                            发布文章
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
