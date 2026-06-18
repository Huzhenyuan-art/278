export class HttpUtil {
    static BASE_URL = '/api';

    static getToken() {
        return localStorage.getItem('token');
    }

    static async parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        
        const text = await response.text();
        if (text.trim().startsWith('<')) {
            console.warn('Server returned HTML instead of JSON:', text.substring(0, 200));
            throw new Error('服务器连接异常，请稍后重试');
        }
        
        try {
            return JSON.parse(text);
        } catch {
            throw new Error('服务器响应格式错误');
        }
    }

    static async request(endpoint, options = {}) {
        const token = this.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${this.BASE_URL}${endpoint}`, config);
            const data = await this.parseResponse(response);

            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                throw new Error(data.message || data.error || '用户名或密码错误');
            }
            
            if (!response.ok) {
                throw new Error(data.message || data.error || '请求失败，请稍后重试');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            
            if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
                throw new Error('服务器连接异常，请稍后重试');
            }
            
            if (error.message === 'Failed to fetch') {
                throw new Error('无法连接到服务器，请检查网络');
            }
            
            throw error;
        }
    }

    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    static put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    static delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
