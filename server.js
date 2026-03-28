const express = require('express');
const Stripe = require('stripe');
const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

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

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { baseProduct, addons = [], bundle = null } = req.body;
    
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
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
