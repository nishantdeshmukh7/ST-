require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const sequelize = require('./config/database');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Pass = require('./models/Pass');
const Reward = require('./models/Reward');
const Redemption = require('./models/Redemption');
const Route = require('./models/Route');

const app = express();

// --- Startup Validation ---
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("WARNING: Razorpay environment variables are missing. Payment features will fail.");
}
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error("FATAL ERROR: JWT_SECRET environment variable is missing in production!");
  process.exit(1);
}

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// Separate key for conductor offline verification — NEVER expose JWT_SECRET itself
const VERIFY_KEY = process.env.VERIFY_KEY || 'conductor_verify_key_change_in_prod';

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error('RAZORPAY_KEY_SECRET not configured');
    return false;
  }
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update((orderId || '') + "|" + (paymentId || ''))
    .digest('hex');
  return generatedSignature === signature;
};

// Generate a unique 6-digit uppercase alphanumeric code
const generateUniqueTicketId = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await Ticket.findOne({ where: { ticketId: code } });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// Generate a unique 8-digit uppercase alphanumeric pass code
const generateUniquePassId = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await Pass.findOne({ where: { passId: code } });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// Generate a unique 14-character alphanumeric reward code (ST-REDEEM-XXXXXX)
const generateUniqueRedemptionCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = 'ST-REDEEM-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await Redemption.findOne({ where: { code } });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// Sync Database — only alter tables in development
const syncOptions = process.env.NODE_ENV === 'production' ? {} : { alter: true };
sequelize.sync(syncOptions).then(async () => {
  console.log('SQLite Database synced');

  // Seed default rewards
  try {
    const rewardsCount = await Reward.count();
    if (rewardsCount === 0) {
      await Reward.bulkCreate([
        {
          title: '₹10 Ticket Discount',
          description: 'Get ₹10 off on any single-ride bus ticket booking.',
          cost: 100,
          category: 'ticket_discount',
          value: 10.0,
          partnerName: 'ST Pay'
        },
        {
          title: '₹25 Ticket Discount',
          description: 'Get ₹25 off on any single-ride bus ticket booking.',
          cost: 220,
          category: 'ticket_discount',
          value: 25.0,
          partnerName: 'ST Pay'
        },
        {
          title: '₹20 Wallet Recharge',
          description: 'Instantly add ₹20 to your ST Digital Wallet balance.',
          cost: 200,
          category: 'wallet_recharge',
          value: 20.0,
          partnerName: 'ST Pay Wallet'
        },
        {
          title: '₹50 Wallet Recharge',
          description: 'Instantly add ₹50 to your ST Digital Wallet balance.',
          cost: 450,
          category: 'wallet_recharge',
          value: 50.0,
          partnerName: 'ST Pay Wallet'
        },
        {
          title: 'Free Tea at Sion Depot Canteen',
          description: 'Get a free piping hot cup of tea at the Sion Depot Canteen.',
          cost: 50,
          category: 'merchant_voucher',
          value: 12.0,
          partnerName: 'Sion Depot Canteen'
        }
      ]);
      console.log('Default loyalty rewards seeded');
    }
  } catch (err) {
    console.error('Failed to seed default rewards:', err);
  }

  // Seed default routes
  try {
    const routesCount = await Route.count();
    if (routesCount === 0) {
      await Route.bulkCreate([
        {
          busId: 'BUS001-AT',
          busName: 'Andheri-Thane Express',
          direction: 'Andheri to Thane',
          stops: JSON.stringify([
            { name: 'Andheri', distance: 0 },
            { name: 'Jogeshwari', distance: 5 },
            { name: 'Goregaon', distance: 10 },
            { name: 'Malad', distance: 15 },
            { name: 'Thane', distance: 25 },
          ])
        },
        {
          busId: 'BUS001-TA',
          busName: 'Thane-Andheri Express',
          direction: 'Thane to Andheri',
          stops: JSON.stringify([
            { name: 'Thane', distance: 0 },
            { name: 'Malad', distance: 10 },
            { name: 'Goregaon', distance: 15 },
            { name: 'Jogeshwari', distance: 20 },
            { name: 'Andheri', distance: 25 },
          ])
        },
        {
          busId: 'BUS002-BM',
          busName: 'Bandra-Mulund Shuttle',
          direction: 'Bandra to Mulund',
          stops: JSON.stringify([
            { name: 'Bandra', distance: 0 },
            { name: 'Sion', distance: 6 },
            { name: 'Ghatkopar', distance: 10 },
            { name: 'Mulund', distance: 18 },
          ])
        },
        {
          busId: 'BUS002-MB',
          busName: 'Mulund-Bandra Shuttle',
          direction: 'Mulund to Bandra',
          stops: JSON.stringify([
            { name: 'Mulund', distance: 0 },
            { name: 'Ghatkopar', distance: 8 },
            { name: 'Sion', distance: 12 },
            { name: 'Bandra', distance: 18 },
          ])
        },
        {
          busId: 'BUS003-DV',
          busName: 'Dadar-Vashi Connector',
          direction: 'Dadar to Vashi',
          stops: JSON.stringify([
            { name: 'Dadar', distance: 0 },
            { name: 'Sion', distance: 5 },
            { name: 'Chembur', distance: 10 },
            { name: 'Vashi', distance: 16 },
          ])
        },
        {
          busId: 'BUS003-VD',
          busName: 'Vashi-Dadar Connector',
          direction: 'Vashi to Dadar',
          stops: JSON.stringify([
            { name: 'Vashi', distance: 0 },
            { name: 'Chembur', distance: 6 },
            { name: 'Sion', distance: 11 },
            { name: 'Dadar', distance: 16 },
          ])
        }
      ]);
      console.log('Default bus routes seeded');
    }
  } catch (err) {
    console.error('Failed to seed default routes:', err);
  }
}).catch(err => console.error('DB Sync Error:', err));

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-check middleware factory
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized: insufficient permissions' });
  }
  next();
};

// --- AUTH ROUTES ---

// Seed Users
app.post('/api/auth/seed', async (req, res) => {
  try {
    const hash = (pw) => bcrypt.hash(pw, 10);

    await User.findOrCreate({
      where: { email: 'admin@stpay.com' },
      defaults: { password: await hash('password123'), role: 'admin' }
    });

    await User.findOrCreate({
      where: { email: 'conductor@stpay.com' },
      defaults: { password: await hash('password123'), role: 'conductor' }
    });

    const [passengerUser, passengerCreated] = await User.findOrCreate({
      where: { email: 'passenger@stpay.com' },
      defaults: { password: await hash('password123'), role: 'passenger', stCoins: 0, walletBalance: 200 }
    });
    if (!passengerCreated) {
      await passengerUser.update({ walletBalance: 200 });
    }

    res.json({ success: true, message: 'Emulator accounts seeded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Passenger Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'passenger',
      stCoins: 0,
      walletBalance: 0
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { uid: user.id, email: user.email, isAnonymous: false }, role: user.role, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { uid: user.id, email: user.email, isAnonymous: false }, role: user.role, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anonymous (Passenger) Login
app.post('/api/auth/anonymous', async (req, res) => {
  try {
    const uid = 'anon_' + Date.now() + Math.floor(Math.random() * 1000);
    // Hash even the anonymous placeholder password for consistency
    const hashedPw = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const user = await User.create({
      id: uid,
      email: `${uid}@anonymous.stpay.com`,
      password: hashedPw,
      role: 'passenger',
      stCoins: 0
    });

    const token = jwt.sign({ id: user.id, role: 'passenger' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { uid: user.id, isAnonymous: true, stCoins: user.stCoins }, role: 'passenger', token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Current User
app.get('/api/users/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ uid: user.id, email: user.email, role: user.role, stCoins: user.stCoins, walletBalance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Secure key delivery for conductor offline validation
// Returns a SEPARATE verification key — NOT the JWT signing secret
app.get('/api/auth/verify-key', authenticate, (req, res) => {
  if (req.user.role !== 'conductor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized access to verification key.' });
  }
  res.json({ secret: VERIFY_KEY });
});

// Recharge Wallet
app.post('/api/wallet/recharge', authenticate, async (req, res) => {
  try {
    const { amount, paymentId, orderId, signature } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // Cryptographic signature verification
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.increment('walletBalance', { by: amount });
    await user.reload();

    res.json({ success: true, newBalance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TICKET ROUTES ---

// Generate Alphanumeric Ticket ID (server-side, single query)
app.post('/api/tickets/generate-id', authenticate, async (req, res) => {
  try {
    const ticketId = await generateUniqueTicketId();
    res.json({ ticketId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Ticket
app.post('/api/tickets', authenticate, async (req, res) => {
  try {
    const ticketData = { ...req.body };
    if (!ticketData.passengerUid) {
      ticketData.passengerUid = req.user.id;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ── Coupon validation ──────────────────────────────────────────────────
    let discount = 0;
    let redemption = null;
    if (ticketData.couponCode) {
      redemption = await Redemption.findOne({
        where: {
          code: ticketData.couponCode,
          passengerUid: user.id,
          status: 'active'
        }
      });
      if (!redemption) {
        return res.status(400).json({ error: 'Invalid or already used coupon code' });
      }
      const reward = await Reward.findByPk(redemption.rewardId);
      if (reward && reward.category === 'ticket_discount') {
        discount = reward.value;
      } else {
        return res.status(400).json({ error: 'Coupon is not applicable for tickets' });
      }
    }

    // ── Fare recalculation (server always recomputes, ignores client amount) ──
    const originalAmount = (ticketData.distance || 0) * (ticketData.passengerCount || 1) * 2;
    const finalAmount = Math.max(0, originalAmount - discount);
    ticketData.amount = finalAmount;

    // ── UPI signature verification ─────────────────────────────────────────
    if (ticketData.paymentStatus === 'completed' && ticketData.paymentMethod === 'upi') {
      if (!verifyRazorpaySignature(ticketData.orderId, ticketData.paymentId, ticketData.signature)) {
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }
      ticketData.paymentVerified = true;
    }

    // ── Wallet payment: deduct balance, mark verified ──────────────────────
    if (ticketData.paymentMethod === 'wallet') {
      if (user.walletBalance < finalAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }
      await user.decrement('walletBalance', { by: finalAmount });
      ticketData.paymentStatus = 'completed';
      ticketData.paymentVerified = true;
    }

    // ── ST Coins: calculate but DO NOT award yet (awarded at conductor scan) ─
    const coinsEarned = Math.floor((ticketData.distance || 0) * (ticketData.passengerCount || 1));
    ticketData.coinsEarned = coinsEarned;
    ticketData.coinsAwarded = false;

    // ── Consume coupon at creation if already paid (wallet or UPI immediate) ─
    // For pending tickets, coupon is consumed when conductor verifies
    if (redemption && ticketData.paymentVerified) {
      await redemption.update({ status: 'used' });
    }

    // ── Generate JWT QR Token ──────────────────────────────────────────────
    const qrPayload = {
      tid: ticketData.ticketId,
      f: ticketData.fromStation,
      t: ticketData.toStation,
      px: ticketData.passengerCount,
      dt: ticketData.bookingTime
    };
    ticketData.qrToken = jwt.sign(qrPayload, VERIFY_KEY);

    const ticket = await Ticket.create(ticketData);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get My Tickets
app.get('/api/tickets/my-tickets', authenticate, async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { passengerUid: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Tickets (conductor/admin only)
app.get('/api/tickets', authenticate, requireRole('conductor', 'admin'), async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ order: [['createdAt', 'DESC']] });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Ticket By ID
app.get('/api/tickets/:ticketId', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ where: { ticketId: req.params.ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Ticket (used when UPI payment completes after ticket was pre-created as pending)
app.patch('/api/tickets/:ticketId', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ where: { ticketId: req.params.ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updates = req.body;
    const paymentMethod = updates.paymentMethod || ticket.paymentMethod || 'upi';

    // Verify UPI signature when completing payment
    if (updates.paymentStatus === 'completed' && paymentMethod === 'upi') {
      const orderId = updates.orderId || ticket.orderId;
      const paymentId = updates.paymentId || ticket.paymentId;
      const signature = updates.signature;
      if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }
      updates.paymentVerified = true;
    }

    // Check if ticket was previously un-verified (pending → paid by UPI)
    const wasAlreadyVerified = ticket.paymentVerified;

    await ticket.update(updates);

    // Fetch fresh ticket state after update
    const freshTicket = await Ticket.findOne({ where: { ticketId: req.params.ticketId } });

    // Consume coupon if newly paid (was pending, now completed) and not already consumed
    if (!wasAlreadyVerified && freshTicket.paymentVerified && freshTicket.couponCode) {
      const redemption = await Redemption.findOne({
        where: {
          code: freshTicket.couponCode,
          passengerUid: freshTicket.passengerUid,
          status: 'active'
        }
      });
      if (redemption) {
        await redemption.update({ status: 'used' });
      }
    }

    // NOTE: ST Coins are NOT awarded here.
    // They are awarded when the conductor scans and verifies the ticket (bulk-verify).
    // This prevents coins from being awarded before the passenger boards.

    res.json(freshTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Verify Tickets (conductor scan — this is where coins are awarded)
app.post('/api/tickets/bulk-verify', authenticate, async (req, res) => {
  try {
    const { tickets } = req.body;
    if (!Array.isArray(tickets)) {
      return res.status(400).json({ error: 'Invalid tickets format. Expected an array.' });
    }

    const results = [];
    for (const item of tickets) {
      const { ticketId, verifiedTime } = item;
      const ticket = await Ticket.findOne({ where: { ticketId } });
      if (ticket) {
        const wasAlreadyCoinsAwarded = ticket.coinsAwarded;

        await ticket.update({
          verified: true,
          paymentVerified: true,
          verifiedTime: verifiedTime || new Date().toLocaleString()
        });

        // ── Award ST Coins once at conductor scan ──────────────────────────
        if (!wasAlreadyCoinsAwarded && ticket.coinsEarned > 0) {
          const user = await User.findByPk(ticket.passengerUid);
          if (user) {
            await user.increment('stCoins', { by: ticket.coinsEarned });
            await ticket.update({ coinsAwarded: true });
          }
        }

        // ── Consume coupon if it was a pending ticket now being verified ───
        if (ticket.couponCode) {
          const redemption = await Redemption.findOne({
            where: {
              code: ticket.couponCode,
              passengerUid: ticket.passengerUid,
              status: 'active'
            }
          });
          if (redemption) {
            await redemption.update({ status: 'used' });
          }
        }

        results.push({ ticketId, status: 'success' });
      } else if (item.fromStation) {
        // Offline ticket: create and immediately award coins
        const newTicket = await Ticket.create({
          ...item,
          verified: true,
          paymentVerified: true,
          paymentStatus: 'completed',
          coinsAwarded: false
        });

        if (newTicket.coinsEarned > 0) {
          const user = await User.findByPk(newTicket.passengerUid);
          if (user) {
            await user.increment('stCoins', { by: newTicket.coinsEarned });
            await newTicket.update({ coinsAwarded: true });
          }
        }

        if (newTicket.couponCode) {
          const redemption = await Redemption.findOne({
            where: {
              code: newTicket.couponCode,
              passengerUid: newTicket.passengerUid,
              status: 'active'
            }
          });
          if (redemption) {
            await redemption.update({ status: 'used' });
          }
        }

        results.push({ ticketId, status: 'created' });
      } else {
        results.push({ ticketId, status: 'not_found' });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PASS ROUTES ---

// Create Pass
app.post('/api/passes', authenticate, async (req, res) => {
  try {
    const { busId, busName, type, paymentMethod } = req.body;
    if (!busId || !busName || !type) {
      return res.status(400).json({ error: 'busId, busName, and type are required' });
    }
    if (type !== 'weekly' && type !== 'monthly') {
      return res.status(400).json({ error: 'Type must be weekly or monthly' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let amount = 0;
    if (type === 'weekly') {
      amount = busId === 'ALL' ? 300 : 150;
    } else {
      amount = busId === 'ALL' ? 900 : 500;
    }

    if (paymentMethod === 'wallet') {
      if (user.walletBalance < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }
      await user.decrement('walletBalance', { by: amount });
    }

    const passId = await generateUniquePassId();
    const startDate = new Date().toISOString();
    const durationDays = type === 'weekly' ? 7 : 30;
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const qrPayload = {
      pid: passId,
      uid: user.id,
      bid: busId,
      bn: busName,
      t: type,
      sd: startDate,
      ed: endDate
    };
    const qrToken = jwt.sign(qrPayload, VERIFY_KEY);

    const pass = await Pass.create({
      passId,
      passengerUid: user.id,
      busId,
      busName,
      type,
      startDate,
      endDate,
      amount,
      paymentStatus: 'completed',
      paymentMethod: paymentMethod || 'wallet',
      qrToken
    });

    res.json(pass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get My Passes
app.get('/api/passes/my-passes', authenticate, async (req, res) => {
  try {
    const passes = await Pass.findAll({
      where: { passengerUid: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(passes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- BUS ROUTES ENDPOINTS ---

// Get All Routes
app.get('/api/routes', async (req, res) => {
  try {
    const routes = await Route.findAll({ order: [['busId', 'ASC']] });

    // Parse stops JSON in DB results
    const results = {};
    routes.forEach(r => {
      try {
        results[r.busId] = {
          busName: r.busName,
          direction: r.direction,
          route: JSON.parse(r.stops)
        };
      } catch (err) {
        console.error('Failed to parse stops for route:', r.busId, err);
      }
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update Route (Admin Only)
app.post('/api/routes', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { busId, busName, direction, stops } = req.body;
    if (!busId || !busName || !direction || !stops) {
      return res.status(400).json({ error: 'busId, busName, direction, and stops are required' });
    }

    if (!Array.isArray(stops)) {
      return res.status(400).json({ error: 'stops must be an array of station objects' });
    }

    const [route, created] = await Route.findOrCreate({
      where: { busId },
      defaults: {
        busName,
        direction,
        stops: JSON.stringify(stops)
      }
    });

    if (!created) {
      await route.update({
        busName,
        direction,
        stops: JSON.stringify(stops)
      });
    }

    res.json({
      success: true,
      route: {
        busId,
        busName,
        direction,
        route: stops
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Route (Admin Only)
app.delete('/api/routes/:busId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { busId } = req.params;
    const route = await Route.findByPk(busId);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    await route.destroy();
    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Crowd Density for All Routes
app.get('/api/routes/crowd-density', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Find all tickets verified in the last hour
    const activeTickets = await Ticket.findAll({
      where: {
        verified: true,
        updatedAt: {
          [Op.gte]: oneHourAgo
        }
      }
    });

    // Count tickets per busId
    const densityMap = {};
    activeTickets.forEach((ticket) => {
      const bid = ticket.busId;
      const passengerCount = ticket.passengerCount || 1;
      densityMap[bid] = (densityMap[bid] || 0) + passengerCount;
    });

    // Expose density level for each route:
    // Low: count < 5, Medium: 5 to 15, High: > 15
    const results = {};
    Object.keys(densityMap).forEach((bid) => {
      const count = densityMap[bid];
      let level = 'low';
      if (count >= 5 && count <= 15) level = 'medium';
      else if (count > 15) level = 'high';
      results[bid] = { count, level };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LOYALTY REWARDS ROUTES ---

// Get All Rewards
app.get('/api/rewards', authenticate, async (req, res) => {
  try {
    const rewards = await Reward.findAll({ order: [['cost', 'ASC']] });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redeem Reward
app.post('/api/rewards/redeem', authenticate, async (req, res) => {
  try {
    const { rewardId } = req.body;
    if (!rewardId) return res.status(400).json({ error: 'rewardId is required' });

    const reward = await Reward.findByPk(rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.stCoins < reward.cost) {
      return res.status(400).json({ error: 'Insufficient ST Coins balance' });
    }

    // Deduct coins
    await user.decrement('stCoins', { by: reward.cost });

    const code = await generateUniqueRedemptionCode();
    const redeemedAt = new Date().toISOString();

    const redemption = await Redemption.create({
      passengerUid: user.id,
      rewardId,
      code,
      status: reward.category === 'wallet_recharge' ? 'used' : 'active',
      redeemedAt
    });

    // Handle Wallet Auto-Recharge
    if (reward.category === 'wallet_recharge') {
      await user.increment('walletBalance', { by: reward.value });
    }

    // Reload user to get fresh balances after all increments/decrements
    await user.reload();

    res.json({
      success: true,
      redemption,
      stCoins: user.stCoins,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get My Redemptions
app.get('/api/rewards/my-redemptions', authenticate, async (req, res) => {
  try {
    const redemptions = await Redemption.findAll({
      where: { passengerUid: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    const results = [];
    for (const r of redemptions) {
      const reward = await Reward.findByPk(r.rewardId);
      results.push({
        ...r.toJSON(),
        rewardTitle: reward ? reward.title : 'Unknown Reward',
        rewardDescription: reward ? reward.description : '',
        rewardCategory: reward ? reward.category : 'ticket_discount',
        rewardValue: reward ? reward.value : 0,
        partnerName: reward ? reward.partnerName : ''
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PAYMENT ROUTE (Razorpay) ---
app.post('/api/payments/create-order', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    const response = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
      }
    );

    res.json({
      orderId: response.data.id,
      amount: response.data.amount,
      currency: response.data.currency,
    });
  } catch (error) {
    console.error('Error creating order:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
