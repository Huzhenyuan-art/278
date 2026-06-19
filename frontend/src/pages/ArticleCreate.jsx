import React from 'react';
import { useNavigate } from 'react-router-dom';
import ArticleForm from '../components/ArticleForm';

const ArticleCreate = () => {
    const navigate = useNavigate();

    const handleSubmitSuccess = () => {
        navigate('/');
    };

    return (
        <ArticleForm
            mode="create"
            title="发布新文章"
            subtitle="分享你的技术见解与实战经验（支持 Markdown）"
            backButtonText="返回"
            onSubmitSuccess={handleSubmitSuccess}
        />
    );
};

export default ArticleCreate;
