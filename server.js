require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  'penalty-response-documentation': 'price_1TEEINDI2s7djsNjSWp8WfRS',
  'beneficial-ownership-filing-preparation': 'price_1TDuWaDI2s7djsNjoNqh2o4J',
  'termination-documentation-system': 'price_1TEArmDI2s7djsNjgNpxNhrQ',
  'employee-notice-documentation': 'price_1TFMtFDI2s7djsNj4606HyZP',
  'workplace-incident-documentation': 'price_1TEAFpDI2s7djsNjED7B3cnf',
  'contractor-documentation-system': 'price_1TEAZaDI2s7djsNjJ91ppFXp',
  'new-hire-documentation': 'price_1TE1d3DI2s7djsNjZJ1gTlnB',
  'license-renewal-documentation': 'price_1TDycnDI2s7djsNjl7FtGcgI',
  'payroll-documentation-readiness': 'price_1TFNx0DI2s7djsNjjrQwl0oZ',
  'ny-filing-preparation': 'price_1TEDf4DI2s7djsNjx3HASWto',
  'paystub-documentation-kit': 'price_1TD4xpDI2s7djsNjEORRDJbZ',
  'prenatal-leave-documentation': 'price_1TFMWNDI2s7djsNjvCPJjHSO',
  'work-schedule-documentation': 'price_1TFMFKDI2s7djsNj3iS4tqrQ',
  'trapped-at-work-documentation': 'price_1TFOJXDI2s7djsNjAZLZILp3',

  'upgrade-payroll': 'price_1TFnlpDI2s7djsNjCflLF1l2',
  'upgrade-newhire': 'price_1TFnocDI2s7djsNjkPIU1fzv',
  'upgrade-workschedule': 'price_1TFnrZDI2s7djsNj98Z3NFea',

  'bundle-complete': 'price_1TFnOrDI2s7djsNjGKv49inp'
};

const ALL_UPGRADES = [
  'upgrade-payroll',
  'upgrade-newhire',
  'upgrade-workschedule'
];

function getSiteUrl() {
  const raw = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');

  if (!raw) {
    throw new Error('Missing PUBLIC_SITE_URL environment variable');
  }

  if (!/^https?:\/\//i.test(raw)) {
    throw new Error('PUBLIC_SITE_URL must include http:// or https://');
  }

  return raw;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { baseProduct, addons, bundle } = req.body || {};
    let line_items = [];

    if (bundle === 'bundle-complete') {
      line_items.push({ price: PRODUCTS['bundle-complete'], quantity: 1 });
    } else {
      if (!PRODUCTS[baseProduct]) {
        return res.status(400).json({ error: 'Invalid product' });
      }

      line_items.push({ price: PRODUCTS[baseProduct], quantity: 1 });

      const cleanAddons = Array.isArray(addons)
        ? addons.filter((addon) => PRODUCTS[addon])
        : [];

      const hasAll = ALL_UPGRADES.every((addon) => cleanAddons.includes(addon));

      if (hasAll) {
        line_items.push({ price: PRODUCTS['bundle-complete'], quantity: 1 });
      } else {
        cleanAddons.forEach((addon) => {
          line_items.push({ price: PRODUCTS[addon], quantity: 1 });
        });
      }
    }

    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${siteUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      billing_address_collection: 'auto',
      allow_promotion_codes: true
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Unable to create checkout session.' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`BroadLocal checkout server running on port ${process.env.PORT || 3000}`);
});
