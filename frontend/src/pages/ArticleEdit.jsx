import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArticleForm from '../components/ArticleForm';

const ArticleEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const handleSubmitSuccess = () => {
        navigate(`/article/${id}`);
    };

    return (
        <ArticleForm
            mode="edit"
            articleId={id}
            title="编辑文章"
            subtitle="完善你的技术分享内容（支持 Markdown）"
            backButtonText="取消"
            onSubmitSuccess={handleSubmitSuccess}
        />
    );
};

export default ArticleEdit;
