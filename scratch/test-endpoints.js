const crypto = require('crypto');

async function testEvaluate() {
  console.log('--- TESTING EVALUATE ENDPOINT ---');
  const partnerName = 'NETVENDOR';
  const secret = 'netvendor_secret_key_12345';
  
  const payload = {
    meterNumber: '777300400',
    purchaseAmountCents: 15000,
    channel: 'BOXER',
    transactionId: 'TXN-' + Math.floor(Math.random() * 1000000)
  };
  
  const bodyString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('hex');
    
  console.log('Sending payload:', bodyString);
  console.log('Computed signature:', signature);
  
  try {
    const response = await fetch('http://localhost:3000/api/v1/intercept/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-partner-name': partnerName,
        'x-volt-signature': signature
      },
      body: bodyString
    });
    
    const result = await response.json();
    console.log('HTTP Status:', response.status);
    console.log('Response payload:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Fetch error in testEvaluate:', error);
  }
}

async function testCheckout() {
  console.log('\n--- TESTING CHECKOUT ENDPOINT ---');
  const payload = {
    meterNumber: '777300400',
    amountCents: 20000,
    transactionId: 'TXN-PAY-' + Math.floor(Math.random() * 1000000),
    status: 'SUCCESSFUL'
  };
  
  const bodyString = JSON.stringify(payload);
  console.log('Sending payload:', bodyString);
  
  try {
    const response = await fetch('http://localhost:3000/api/v1/payments/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyString
    });
    
    const result = await response.json();
    console.log('HTTP Status:', response.status);
    console.log('Response payload:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Fetch error in testCheckout:', error);
  }
}

async function run() {
  await testEvaluate();
  await testCheckout();
}

run();
