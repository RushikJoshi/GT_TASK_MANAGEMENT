import axiosInstance from './axiosInstance';

export const projectApi = {
    getAllProjects: async () => {
        const response = await axiosInstance.get('/projects');
        return response.data;
    },
    getProjectStats: async () => {
        // Assuming you have an endpoint for this, if not we will calculate on frontend for now
        // This is a placeholder for actual backend implementation if exist.
        const response = await axiosInstance.get('/projects/stats').catch(() => ({ data: null }));
        return response.data;
    }
};
