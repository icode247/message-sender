
import axios from 'axios';

const API_URL = '/api/auth';

const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data;
};

const logout = async () => {
    const response = await axios.post(`${API_URL}/logout`);
    return response.data;
};

const check = async () => {
    const response = await axios.get(`${API_URL}/check`);
    return response.data;
};

export const authService = {
    login,
    logout,
    check,
};
