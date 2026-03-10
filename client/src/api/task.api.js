import axiosInstance from './axiosInstance';

export const taskApi = {
    getAllTasks: async () => {
        const response = await axiosInstance.get('/tasks');
        return response.data;
    }
};
