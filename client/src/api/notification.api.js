import axiosInstance from './axiosInstance';

const BASE = '/notifications';

export const notificationApi = {
    getAll: async () => {
        const res = await axiosInstance.get(BASE);
        return res.data;
    },
    create: async (payload) => {
        const res = await axiosInstance.post(BASE, payload);
        return res.data;
    },
    markAsRead: async (id) => {
        const res = await axiosInstance.put(`${BASE}/${id}/read`);
        return res.data;
    }
};
