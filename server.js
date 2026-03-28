const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const app = express();

// Enable CORS for your Framer site
app.use(cors({
  origin: ['https://broadlocal.com', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Health check route (for testing)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BroadLocal API is running' });
});

// Your checkout route
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { baseProduct, addons = [], bundle = null } = req.body;
    
    console.log('Received checkout request:', { baseProduct, addons, bundle });
    
    const PRODUCTS = {
      'penalty-response': { priceId: 'price_1TEEINDI2s7djsNjSWp8WfRS' },
      'employee-notice': { priceId: 'price_1TFMtFDI2s7djsNj4606HyZP' },
      'payroll-readiness': { priceId: 'price_1TFNx0DI2s7djsNjjrQwl0oZ' },
      'new-hire': { priceId: 'price_1TE1d3DI2s7djsNjZJ1gTlnB' },
      'work-schedule': { priceId: 'price_1TFMFKDI2s7djsNj3iS4tqrQ' },
      'upgrade-payroll': { priceId: 'price_1TFnlpDI2s7djsNjCflLF1l2' },
      'upgrade-newhire': { priceId: 'price_1TFnocDI2s7djsNjkPIU1fzv' },
      'upgrade-workschedule': { priceId: 'price_1TFnrZDI2s7djsNj98Z3NFea' },
      'bundle-complete': { priceId: 'price_1TFnOrDI2s7djsNjGKv49inp' }
    };
    
    let line_items = [];
    
    if (bundle) {
      if (!PRODUCTS[bundle]) {
        return res.status(400).json({ error: 'Invalid bundle' });
      }
      line_items = [{ price: PRODUCTS[bundle].priceId, quantity: 1 }];
    } else {
      if (!baseProduct || !PRODUCTS[baseProduct]) {
        return res.status(400).json({ error: 'Invalid base product' });
      }
      line_items = [{ price: PRODUCTS[baseProduct].priceId, quantity: 1 }];
      for (const addon of addons) {
        if (PRODUCTS[addon]) {
          line_items.push({ price: PRODUCTS[addon].priceId, quantity: 1 });
        }
      }
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/cart.html`
    });
    
    console.log('Checkout session created:', session.id);
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed', details: error.message });
  }
});

// Test route to verify API is working
app.get('/test', (req, res) => {
  res.json({ message: 'API is working! Use POST to /create-checkout-session' });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
