import axiosInstance from './axiosInstance';

export const dashboardApi = {
    getStats: async () => {
        const response = await axiosInstance.get('/dashboard/stats');
        return response.data;
    },
    getActiveProjects: async () => {
        const response = await axiosInstance.get('/dashboard/projects');
        return response.data;
    },
    getRecentActivity: async () => {
        const response = await axiosInstance.get('/dashboard/activity');
        return response.data;
    },
    getMyTasks: async (userId) => {
        const response = await axiosInstance.get(`/dashboard/my-tasks/${userId}`);
        return response.data;
    }
};
