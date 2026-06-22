import apiService from './apiService';

const generateTicketId = async () => {
  try {
    return await apiService.generateTicketId();
  } catch (error) {
    console.warn('Failed to generate ticket ID from server, using local 6-char alphanumeric fallback:', error);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
};

export default generateTicketId;