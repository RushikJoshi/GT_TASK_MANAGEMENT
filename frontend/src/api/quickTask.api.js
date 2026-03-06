import axiosInstance from './axiosInstance';

const BASE = '/quick-tasks';

export const quickTaskApi = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await axiosInstance.get(`${BASE}${query ? '?' + query : ''}`);
        return res.data;
    },
    getStats: async () => {
        const res = await axiosInstance.get(`${BASE}/stats`);
        return res.data;
    },
    getById: async (id) => {
        const res = await axiosInstance.get(`${BASE}/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await axiosInstance.post(BASE, data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await axiosInstance.put(`${BASE}/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await axiosInstance.delete(`${BASE}/${id}`);
        return res.data;
    },
    addComment: async (id, text) => {
        const res = await axiosInstance.post(`${BASE}/${id}/comments`, { text });
        return res.data;
    },
    updateChecklistItem: async (taskId, itemId, completed) => {
        const res = await axiosInstance.patch(`${BASE}/${taskId}/checklist/${itemId}`, { completed });
        return res.data;
    },
    // alias so both names work
    toggleChecklist: async (taskId, itemId, completed) => {
        const res = await axiosInstance.patch(`${BASE}/${taskId}/checklist/${itemId}`, { completed });
        return res.data;
    }
};

