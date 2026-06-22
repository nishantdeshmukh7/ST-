const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:5001/api';
const SECRET = '5pdPc7OqKQ26LP4b58uNNlOJ';

async function runTest() {
  try {
    console.log('1. Logging in anonymously...');
    const loginRes = await axios.post(`${API_URL}/auth/anonymous`);
    const token = loginRes.data.token;
    console.log('Login successful. Token:', token);

    const client = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n2. Creating a payment order...');
    const orderRes = await client.post('/payments/create-order', { amount: 20 });
    const { orderId } = orderRes.data;
    console.log('Order created. Order ID:', orderId);

    const paymentId = 'pay_mock_' + Date.now();
    console.log('\n3. Generating cryptographic signature locally...');
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    console.log('Signature:', signature);

    const ticketData = {
      ticketId: 'TST' + Math.floor(1000 + Math.random() * 9000),
      busId: 'BUS001-AT',
      busName: 'Andheri-Thane Express',
      direction: 'Andheri to Thane',
      fromStation: 'Andheri',
      toStation: 'Goregaon',
      distance: 10,
      passengerCount: 1,
      amount: 20,
      paymentStatus: 'completed',
      paymentMethod: 'upi',
      paymentId: paymentId,
      orderId: orderId,
      signature: signature,
      timestamp: new Date().toISOString(),
      bookingTime: new Date().toLocaleString()
    };

    console.log('\n4. Sending ticket creation request with signature...');
    const ticketRes = await client.post('/tickets', ticketData);
    console.log('Ticket creation successful!', ticketRes.data);
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

runTest();
