const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function run() {
  try {
    console.log('1. Seeding emulator accounts...');
    await axios.post(`${BASE_URL}/auth/seed`);

    console.log('2. Logging in Admin...');
    const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@stpay.com',
      password: 'password123'
    });
    const adminToken = adminRes.data.token;
    console.log('Admin logged in successfully.');

    console.log('3. Logging in Passenger...');
    const passengerRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'passenger@stpay.com',
      password: 'password123'
    });
    const passengerToken = passengerRes.data.token;
    console.log('Passenger logged in successfully.');

    console.log('4. Fetching initial routes (should succeed for anyone)...');
    const initialRoutesRes = await axios.get(`${BASE_URL}/routes`);
    const initialRoutesCount = Object.keys(initialRoutesRes.data).length;
    console.log(`Initial routes count: ${initialRoutesCount}`);

    console.log('5. Creating custom route as Admin...');
    const customRoute = {
      busId: 'BUS004-KT',
      busName: 'Kalyan-Thane Shuttle',
      direction: 'Kalyan to Thane',
      stops: [
        { name: 'Kalyan', distance: 0 },
        { name: 'Kalwa', distance: 12 },
        { name: 'Thane', distance: 15 }
      ]
    };

    const createRes = await axios.post(`${BASE_URL}/routes`, customRoute, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Created route successfully:', createRes.data.route);

    console.log('6. Verifying passenger cannot create custom route (should fail with 403)...');
    try {
      await axios.post(`${BASE_URL}/routes`, customRoute, {
        headers: { Authorization: `Bearer ${passengerToken}` }
      });
      throw new Error('Passenger was allowed to create a custom route!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('Passenger correctly denied route creation: 403 Forbidden');
      } else {
        throw err;
      }
    }

    console.log('7. Verifying route list now contains the custom route...');
    const updatedRoutesRes = await axios.get(`${BASE_URL}/routes`);
    const updatedRoutes = updatedRoutesRes.data;
    console.log(`Updated routes count: ${Object.keys(updatedRoutes).length}`);
    if (!updatedRoutes['BUS004-KT']) {
      throw new Error('Custom route BUS004-KT was not found in the list!');
    }
    console.log('Verification successful. Stops are:', updatedRoutes['BUS004-KT'].route);

    console.log('8. Verifying passenger cannot delete custom route (should fail with 403)...');
    try {
      await axios.delete(`${BASE_URL}/routes/BUS004-KT`, {
        headers: { Authorization: `Bearer ${passengerToken}` }
      });
      throw new Error('Passenger was allowed to delete a custom route!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('Passenger correctly denied route deletion: 403 Forbidden');
      } else {
        throw err;
      }
    }

    console.log('9. Deleting custom route as Admin...');
    const deleteRes = await axios.delete(`${BASE_URL}/routes/BUS004-KT`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Deleted route response:', deleteRes.data);

    console.log('10. Verifying route list no longer contains the custom route...');
    const finalRoutesRes = await axios.get(`${BASE_URL}/routes`);
    const finalRoutes = finalRoutesRes.data;
    if (finalRoutes['BUS004-KT']) {
      throw new Error('Custom route BUS004-KT was found after deletion!');
    }
    console.log('Verification successful. Route was deleted.');

    console.log('\nSUCCESS: Custom routes management endpoints verified successfully!');
  } catch (err) {
    console.error('Test execution failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
