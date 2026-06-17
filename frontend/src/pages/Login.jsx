import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { authStyles } from './AuthStyles';
import { Code2, ArrowRight, AlertCircle, Sparkles, Zap, ShieldCheck, Globe } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await HttpUtil.post('/auth/login', formData);
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            navigate('/');
        } catch (err) {
            setError(err.message || '登录失败，请检查用户名和密码');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={authStyles.container}>
            <div className={authStyles.wrapper}>
                {/* Left Side: Info */}
                <div className={authStyles.leftSide}>
                     {/* Decorative background circle */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-20">
                            <Code2 size={24} className="text-white" />
                            <span className="text-xl font-bold tracking-tight">IT技术圈</span>
                        </div>

                        <div className="space-y-6">
                            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
                                沉淀技术价值 <br />
                                <span className="text-blue-200">连接优秀大脑</span>
                            </h1>
                            <p className="text-blue-50/80 text-base max-w-sm leading-relaxed">
                                加入国内最活跃的技术分享社区，与数万名开发者共同探讨行业前沿趋势。
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <Zap size={16} />
                            </div>
                            <span className="text-sm font-medium">高效同步最新技术资讯</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <ShieldCheck size={16} />
                            </div>
                            <span className="text-sm font-medium">安全纯净的技术分享空间</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className={authStyles.rightSide}>
                    <div className={authStyles.card}>
                        <div className="lg:hidden flex mb-8">
                             <div className="flex items-center gap-2">
                                <Code2 size={24} className="text-blue-600" />
                                <span className="text-lg font-bold text-gray-900">IT技术圈</span>
                             </div>
                        </div>

                        <div className="mb-8">
                            <h2 className={authStyles.title}>欢迎回来</h2>
                            <p className={authStyles.subtitle}>请输入您的账号信息进行登录</p>
                        </div>

                        {error && (
                            <div className={authStyles.error}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className={authStyles.inputGroup}>
                                <label className={authStyles.label}>用户名</label>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    className={authStyles.input}
                                    placeholder="请输入用户名"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </div>
                            
                            <div className={authStyles.inputGroup}>
                                <div className="flex justify-between items-center">
                                    <label className={authStyles.label}>密码</label>
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    className={authStyles.input}
                                    placeholder="请输入密码"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <button type="submit" className={authStyles.button} disabled={loading}>
                                {loading ? '正在验证...' : '立即登录'}
                            </button>
                        </form>

                        <div className="text-center pt-6">
                            <p className="text-xs text-gray-500">
                                还没有账号？{' '}
                                <Link to="/register" className={authStyles.link}>
                                    立即注册 <ArrowRight className="inline w-3 h-3 ml-0.5" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
