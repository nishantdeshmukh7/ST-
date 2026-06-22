import axios from 'axios';
import busRoutes from './busRoutes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stpay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ensurePassengerSession = async () => {
  const token = localStorage.getItem('stpay_token');
  if (!token) {
    try {
      const { data } = await axios.post(`${API_URL}/auth/anonymous`);
      localStorage.setItem('stpay_token', data.token);
      localStorage.setItem('stpay_user', JSON.stringify(data.user));
      localStorage.setItem('stpay_role', data.role);
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
    }
  }
};

const apiService = {
  ensurePassengerSession,

  auth: {
    get currentUser() {
      return JSON.parse(localStorage.getItem('stpay_user')) || null;
    }
  },

  signIn: async function (email, password) {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('stpay_token', data.token);
      localStorage.setItem('stpay_user', JSON.stringify(data.user));
      localStorage.setItem('stpay_role', data.role);
      return { user: data.user, role: data.role };
    } catch (error) {
      console.error('Sign-in failed:', error.response?.data || error);
      throw new Error(error.response?.data?.error || 'Sign-in failed');
    }
  },

  register: async function (email, password) {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, { email, password });
      localStorage.setItem('stpay_token', data.token);
      localStorage.setItem('stpay_user', JSON.stringify(data.user));
      localStorage.setItem('stpay_role', data.role);
      return { user: data.user, role: data.role };
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: async function () {
    localStorage.removeItem('stpay_token');
    localStorage.removeItem('stpay_user');
    localStorage.removeItem('stpay_role');
  },

  getUserRole: async function () {
    return localStorage.getItem('stpay_role') || 'passenger';
  },

  seedUsers: async function () {
    try {
      await axios.post(`${API_URL}/auth/seed`);
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to seed users');
    }
  },

  addTicket: async function (ticket) {
    try {
      const { data } = await api.post('/tickets', ticket);
      return data;
    } catch (error) {
      throw new Error(`Failed to add ticket: ${error.response?.data?.error || error.message}`);
    }
  },

  getTickets: async function () {
    try {
      const { data } = await api.get('/tickets');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve tickets: ${error.message}`);
    }
  },

  getMyTickets: async function () {
    try {
      const { data } = await api.get('/tickets/my-tickets');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve tickets: ${error.message}`);
    }
  },

  getMe: async function () {
    try {
      const { data } = await api.get('/users/me');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve user: ${error.message}`);
    }
  },

  rechargeWallet: async function (amount, paymentId, orderId, signature) {
    try {
      const { data } = await api.post('/wallet/recharge', { amount, paymentId, orderId, signature });
      return data;
    } catch (error) {
      throw new Error(`Failed to recharge wallet: ${error.message}`);
    }
  },

  createOrder: async function (amount) {
    try {
      const { data } = await api.post('/payments/create-order', { amount });
      return data;
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  },

  updateTicket: async function (ticketId, updates) {
    try {
      const { data } = await api.patch(`/tickets/${ticketId}`, updates);
      return data;
    } catch (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  },

  bulkVerifyTickets: async function (tickets) {
    try {
      const { data } = await api.post('/tickets/bulk-verify', { tickets });
      return data;
    } catch (error) {
      throw new Error(`Failed to bulk verify tickets: ${error.message}`);
    }
  },

  buyPass: async function (passData) {
    try {
      const { data } = await api.post('/passes', passData);
      return data;
    } catch (error) {
      throw new Error(`Failed to purchase pass: ${error.message}`);
    }
  },

  getMyPasses: async function () {
    try {
      const { data } = await api.get('/passes/my-passes');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve passes: ${error.message}`);
    }
  },

  getCrowdDensity: async function () {
    try {
      const { data } = await api.get('/routes/crowd-density');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve crowd density: ${error.message}`);
    }
  },

  getRewards: async function () {
    try {
      const { data } = await api.get('/rewards');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve rewards: ${error.message}`);
    }
  },

  redeemReward: async function (rewardId) {
    try {
      const { data } = await api.post('/rewards/redeem', { rewardId });
      return data;
    } catch (error) {
      throw new Error(`Failed to redeem reward: ${error.message}`);
    }
  },

  getMyRedemptions: async function () {
    try {
      const { data } = await api.get('/rewards/my-redemptions');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve redemptions: ${error.message}`);
    }
  },

  getTicketById: async function (ticketId) {
    try {
      const { data } = await api.get(`/tickets/${ticketId}`);
      return data;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw new Error(`Failed to retrieve ticket: ${error.message}`);
    }
  },

  generateTicketId: async function () {
    try {
      const { data } = await api.post('/tickets/generate-id');
      return data.ticketId;
    } catch (error) {
      throw new Error(`Failed to generate ticket ID: ${error.message}`);
    }
  },

  getVerificationKey: async function () {
    try {
      const { data } = await api.get('/auth/verify-key');
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve verification key: ${error.message}`);
    }
  },

  getRoutes: async function () {
    try {
      const { data } = await api.get('/routes');
      localStorage.setItem('stpay_cached_routes', JSON.stringify(data));
      return data;
    } catch (error) {
      console.warn('Failed to fetch routes from server, falling back to cache/defaults:', error);
      const cached = localStorage.getItem('stpay_cached_routes');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached routes:', e);
        }
      }
      return busRoutes;
    }
  },

  createRoute: async function (routeData) {
    try {
      const { data } = await api.post('/routes', routeData);
      return data;
    } catch (error) {
      throw new Error(`Failed to create route: ${error.response?.data?.error || error.message}`);
    }
  },

  deleteRoute: async function (busId) {
    try {
      const { data } = await api.delete(`/routes/${busId}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to delete route: ${error.response?.data?.error || error.message}`);
    }
  }
};

export default apiService;
