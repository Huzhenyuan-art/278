import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { HttpUtil } from '../utils/HttpUtil';

const CoverImageUploader = ({ value, onChange }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const getFullUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `/api${url}`;
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('请选择图片文件');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('图片大小不能超过 5MB');
            return;
        }

        setError('');
        setUploading(true);

        try {
            const result = await HttpUtil.uploadCover(file);
            onChange(result.url);
        } catch (err) {
            setError(err.message || '上传失败');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClick = () => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-500" />
                文章封面图
            </label>

            {value ? (
                <div className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <img
                        src={getFullUrl(value)}
                        alt="封面图"
                        className="w-full h-48 object-cover"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                        <X size={18} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                        <p className="text-white text-xs">封面图已上传，点击右上角可删除</p>
                    </div>
                </div>
            ) : (
                <div
                    onClick={handleClick}
                    className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                        uploading
                            ? 'border-blue-300 bg-blue-50/50'
                            : 'border-gray-300 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                >
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                        {uploading ? (
                            <>
                                <Loader2 size={40} className="text-blue-500 animate-spin mb-3" />
                                <p className="text-sm font-medium text-blue-600">上传中...</p>
                            </>
                        ) : (
                            <>
                                <div className="p-3 bg-blue-100 rounded-full mb-3">
                                    <Upload size={28} className="text-blue-600" />
                                </div>
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                    点击上传封面图
                                </p>
                                <p className="text-xs text-gray-400">
                                    支持 JPG、PNG、GIF、WEBP 格式，大小不超过 5MB
                                </p>
                            </>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            )}

            {error && (
                <p className="text-xs text-red-500 ml-1">{error}</p>
            )}
        </div>
    );
};

export default CoverImageUploader;
