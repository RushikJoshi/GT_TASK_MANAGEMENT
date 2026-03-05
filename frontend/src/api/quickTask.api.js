const BASE = 'http://localhost:5000/api/quick-tasks';

const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
});

export const quickTaskApi = {
    getAll: async (token, params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${BASE}${query ? '?' + query : ''}`, {
            headers: authHeaders(token)
        });
        return res.json();
    },
    getStats: async (token) => {
        const res = await fetch(`${BASE}/stats`, { headers: authHeaders(token) });
        return res.json();
    },
    getById: async (token, id) => {
        const res = await fetch(`${BASE}/${id}`, { headers: authHeaders(token) });
        return res.json();
    },
    create: async (token, data) => {
        const res = await fetch(BASE, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(data)
        });
        return res.json();
    },
    update: async (token, id, data) => {
        const res = await fetch(`${BASE}/${id}`, {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(data)
        });
        return res.json();
    },
    delete: async (token, id) => {
        const res = await fetch(`${BASE}/${id}`, {
            method: 'DELETE',
            headers: authHeaders(token)
        });
        return res.json();
    },
    addComment: async (token, id, text) => {
        const res = await fetch(`${BASE}/${id}/comments`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify({ text })
        });
        return res.json();
    },
    toggleChecklist: async (token, taskId, itemId, completed) => {
        const res = await fetch(`${BASE}/${taskId}/checklist/${itemId}`, {
            method: 'PATCH',
            headers: authHeaders(token),
            body: JSON.stringify({ completed })
        });
        return res.json();
    }
};
