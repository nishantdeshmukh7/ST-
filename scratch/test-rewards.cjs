const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5001/api';
const RAZORPAY_KEY_SECRET = '5pdPc7OqKQ26LP4b58uNNlOJ';

// Helper to sign Razorpay orders
function generateSignature(orderId, paymentId) {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest('hex');
}

async function run() {
  try {
    console.log('1. Seeding database & emulator accounts...');
    await axios.post(`${BASE_URL}/auth/seed`);

    console.log('2. Logging in passenger...');
    const passengerRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'passenger@stpay.com',
      password: 'password123'
    });
    const passengerToken = passengerRes.data.token;
    const passengerUid = passengerRes.data.user.uid;
    console.log(`Passenger logged in: UID=${passengerUid}`);

    console.log('3. Logging in conductor...');
    const conductorRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'conductor@stpay.com',
      password: 'password123'
    });
    const conductorToken = conductorRes.data.token;

    console.log('4. Accumulating ST Coins: booking and verifying a high-distance ride...');
    // Earn 150 km * 2 pax = 300 coins
    const ticketIdRes = await axios.post(`${BASE_URL}/tickets/generate-id`, {}, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    const ticketId = ticketIdRes.data.ticketId;
    
    const orderId = 'order_test_coins_1';
    const paymentId = 'pay_test_coins_1';
    const signature = generateSignature(orderId, paymentId);

    const ticketData = {
      ticketId,
      busId: 'BUS001-AT',
      busName: 'Andheri-Thane Express',
      direction: 'Andheri to Thane',
      fromStation: 'Andheri',
      toStation: 'Thane',
      distance: 150,
      passengerCount: 2,
      amount: 600,
      verified: false,
      paymentStatus: 'completed',
      paymentVerified: true,
      timestamp: new Date().toISOString(),
      bookingTime: new Date().toLocaleString(),
      paymentMethod: 'upi',
      orderId,
      paymentId,
      signature
    };

    await axios.post(`${BASE_URL}/tickets`, ticketData, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });

    // Bulk verify as conductor to trigger coin award
    await axios.post(`${BASE_URL}/tickets/bulk-verify`, {
      tickets: [
        { ticketId, verifiedTime: new Date().toLocaleString() }
      ]
    }, {
      headers: { Authorization: `Bearer ${conductorToken}` }
    });

    console.log('Verifying user has acquired ST Coins...');
    const meRes = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    console.log(`Passenger Coins: ${meRes.data.stCoins}, Wallet Balance: ${meRes.data.walletBalance}`);
    if (meRes.data.stCoins < 300) {
      throw new Error(`Expected at least 300 coins, got ${meRes.data.stCoins}`);
    }

    console.log('5. Fetching rewards catalog...');
    const rewardsRes = await axios.get(`${BASE_URL}/rewards`, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    console.log('Rewards catalog count:', rewardsRes.data.length);
    if (rewardsRes.data.length === 0) {
      throw new Error('Rewards store is empty');
    }

    const ticketDiscountReward = rewardsRes.data.find(r => r.category === 'ticket_discount' && r.cost === 100);
    const walletRechargeReward = rewardsRes.data.find(r => r.category === 'wallet_recharge' && r.cost === 200);

    console.log(`Found ticket discount reward: ${ticketDiscountReward.title} (Cost: ${ticketDiscountReward.cost})`);
    console.log(`Found wallet recharge reward: ${walletRechargeReward.title} (Cost: ${walletRechargeReward.cost})`);

    console.log('6. Redeeming ticket discount (cost: 100)...');
    const redeemRes1 = await axios.post(`${BASE_URL}/rewards/redeem`, {
      rewardId: ticketDiscountReward.id
    }, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    console.log('Redeemed successfully. Voucher code:', redeemRes1.data.redemption.code);
    const couponCode = redeemRes1.data.redemption.code;

    console.log('7. Redeeming wallet recharge (cost: 200) and verifying balance auto-increments...');
    const preWalletRes = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    const preBalance = preWalletRes.data.walletBalance;

    const redeemRes2 = await axios.post(`${BASE_URL}/rewards/redeem`, {
      rewardId: walletRechargeReward.id
    }, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });

    console.log('Redeemed wallet recharge successfully.');
    const postWalletRes = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    const postBalance = postWalletRes.data.walletBalance;
    console.log(`Wallet Balance: Before=${preBalance}, After=${postBalance}`);
    if (postBalance !== preBalance + 20) {
      throw new Error(`Expected wallet balance to auto-increment to ${preBalance + 20}, got ${postBalance}`);
    }

    console.log('8. Draining any remaining ST Coins to test insufficient balance checks...');
    let currentCoins = postWalletRes.data.stCoins;
    while (currentCoins >= 100) {
      console.log(`Draining 100 coins... (Current: ${currentCoins})`);
      const redeemDrain = await axios.post(`${BASE_URL}/rewards/redeem`, {
        rewardId: ticketDiscountReward.id
      }, {
        headers: { Authorization: `Bearer ${passengerToken}` }
      });
      currentCoins = redeemDrain.data.stCoins;
    }

    console.log(`Coins successfully drained to ${currentCoins}. Now asserting insufficient coins balance error...`);
    try {
      await axios.post(`${BASE_URL}/rewards/redeem`, {
        rewardId: ticketDiscountReward.id
      }, {
        headers: { Authorization: `Bearer ${passengerToken}` }
      });
      throw new Error('Expected redemption with insufficient coins to fail, but it succeeded');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`Successfully caught expected error: ${err.response.data.error}`);
      } else {
        throw err;
      }
    }

    console.log('9. Checking my redemptions history...');
    const myRedemptionsRes = await axios.get(`${BASE_URL}/rewards/my-redemptions`, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    console.log('My vouchers count:', myRedemptionsRes.data.length);
    if (myRedemptionsRes.data.length < 2) {
      throw new Error('Expected at least 2 redemptions in history');
    }

    console.log('10. Testing coupon code checkout discount...');
    const ticketIdRes3 = await axios.post(`${BASE_URL}/tickets/generate-id`, {}, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    const ticketId3 = ticketIdRes3.data.ticketId;

    // A ride that should cost 10 km * 1 pax * ₹2/km = ₹20
    const checkoutTicket = {
      ticketId: ticketId3,
      busId: 'BUS001-AT',
      busName: 'Andheri-Thane Express',
      direction: 'Andheri to Thane',
      fromStation: 'Andheri',
      toStation: 'Goregaon',
      distance: 10,
      passengerCount: 1,
      amount: 20, // applied coupon should change this to 10 on backend
      verified: false,
      paymentStatus: 'completed',
      paymentVerified: true,
      timestamp: new Date().toISOString(),
      bookingTime: new Date().toLocaleString(),
      paymentMethod: 'wallet',
      couponCode // Pass the coupon code!
    };

    const finalTicketRes = await axios.post(`${BASE_URL}/tickets`, checkoutTicket, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });

    console.log('Ticket booked with coupon successfully. Final ticket details:');
    console.log(`Original cost was ₹20. Backend ticket amount paid is: ₹${finalTicketRes.data.amount}`);
    if (finalTicketRes.data.amount !== 10) {
      throw new Error(`Expected ticket amount to be ₹10 after applying ₹10 discount, but got ${finalTicketRes.data.amount}`);
    }

    console.log('Checking coupon usage status...');
    const myRedemptionsRes2 = await axios.get(`${BASE_URL}/rewards/my-redemptions`, {
      headers: { Authorization: `Bearer ${passengerToken}` }
    });
    const targetVoucher = myRedemptionsRes2.data.find(v => v.code === couponCode);
    console.log(`Voucher status on backend: ${targetVoucher.status}`);
    if (targetVoucher.status !== 'used') {
      throw new Error(`Expected coupon status to be 'used', got ${targetVoucher.status}`);
    }

    console.log('SUCCESS: All Loyalty Rewards Store integrations completed and verified successfully!');
  } catch (error) {
    console.error('Test failed with error:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

run();
