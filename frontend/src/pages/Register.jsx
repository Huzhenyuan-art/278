import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { authStyles } from './AuthStyles';
import { Sparkles, ArrowRight, AlertCircle, Globe, Users, Trophy } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '', email: '' });
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
            const res = await HttpUtil.post('/auth/register', formData);
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            navigate('/');
        } catch (err) {
            setError(err.message || '注册失败，用户名可能已存在');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={authStyles.container}>
            <div className={authStyles.wrapper}>
                {/* Left Side: Info */}
                <div className={`${authStyles.leftSide} !from-[#4f46e5] !to-[#7c3aed]`}>
                    <div className="absolute top-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -ml-20 -mt-20"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-20">
                            <Sparkles size={24} className="text-white" />
                            <span className="text-xl font-bold tracking-tight">IT技术圈</span>
                        </div>

                        <div className="space-y-6">
                            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
                                开启你的 <br />
                                <span className="text-indigo-200">技术觉醒之旅</span>
                            </h1>
                            <p className="text-indigo-50/80 text-base max-w-sm leading-relaxed">
                                不仅仅是分享，更是思想的碰撞。在这里，每一行代码都可能改变世界。
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <Globe size={16} />
                            </div>
                            <span className="text-sm font-medium">获取全球最新技术情报</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <Users size={16} />
                            </div>
                            <span className="text-sm font-medium">零距离对话技术大咖</span>
                        </div>
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <Trophy size={16} />
                            </div>
                            <span className="text-sm font-medium">打造你的技术影响力</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className={authStyles.rightSide}>
                    <div className={authStyles.card}>
                        <div className="lg:hidden flex mb-8">
                             <div className="flex items-center gap-2">
                                <Sparkles size={24} className="text-indigo-600" />
                                <span className="text-lg font-bold text-gray-900">IT技术圈</span>
                             </div>
                        </div>

                        <div className="mb-8">
                            <h2 className={authStyles.title}>创建账户</h2>
                            <p className={authStyles.subtitle}>填写以下信息，开启您的技术之旅</p>
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
                                    minLength={3}
                                    maxLength={20}
                                    className={authStyles.input}
                                    placeholder="3-20个字符"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={authStyles.inputGroup}>
                                <label className={authStyles.label}>电子邮箱</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className={authStyles.input}
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            
                            <div className={authStyles.inputGroup}>
                                <label className={authStyles.label}>密码</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={6}
                                    maxLength={20}
                                    className={authStyles.input}
                                    placeholder="6-20个字符"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <button type="submit" className={authStyles.button} disabled={loading}>
                                 {loading ? '正在创建账户...' : '立即开启'}
                            </button>
                        </form>

                        <div className="text-center pt-8">
                            <p className="text-xs text-gray-500">
                                已经有账号？{' '}
                                <Link to="/login" className={authStyles.link}>
                                    返回登录 <ArrowRight className="inline w-3 h-3 ml-0.5" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
