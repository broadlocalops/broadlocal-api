require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PRODUCT MAP (ONLY PRICE IDS MATTER HERE)
const PRODUCTS = {
  // BASE PRODUCTS
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

  // UPGRADES
  'upgrade-payroll': 'price_1TFnlpDI2s7djsNjCflLF1l2',
  'upgrade-newhire': 'price_1TFnocDI2s7djsNjkPIU1fzv',
  'upgrade-workschedule': 'price_1TFnrZDI2s7djsNj98Z3NFea',

  // BUNDLE
  'bundle-complete': 'price_1TFnOrDI2s7djsNjGKv49inp'
};

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { baseProduct, addons, bundle } = req.body;

    let line_items = [];

    // BUNDLE ONLY
    if (bundle === 'bundle-complete') {
      line_items.push({
        price: PRODUCTS['bundle-complete'],
        quantity: 1
      });
    } else {
      // BASE PRODUCT
      if (baseProduct && PRODUCTS[baseProduct]) {
        line_items.push({
          price: PRODUCTS[baseProduct],
          quantity: 1
        });
      }

      // ADDONS
      if (addons && addons.length > 0) {

        // IF ALL 3 → USE BUNDLE PRICE
        const allUpgrades = ['upgrade-payroll', 'upgrade-newhire', 'upgrade-workschedule'];

        const hasAll = allUpgrades.every(a => addons.includes(a));

        if (hasAll) {
          line_items.push({
            price: PRODUCTS['bundle-complete'],
            quantity: 1
          });
        } else {
          addons.forEach(addon => {
            if (PRODUCTS[addon]) {
              line_items.push({
                price: PRODUCTS[addon],
                quantity: 1
              });
            }
          });
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.PUBLIC_SITE_URL}/thank-you`,
      cancel_url: `${process.env.PUBLIC_SITE_URL}/cart`
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running'));
