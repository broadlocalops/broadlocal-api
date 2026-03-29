/**
 * create-checkout-session.js
 *
 * Production-ready Express endpoint for BroadLocal checkout.
 *
 * Route:
 *   POST /api/create-checkout-session
 *
 * Requirements:
 *   npm install express stripe dotenv
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY=sk_live_xxx
 *   APP_BASE_URL=https://broadlocal.com
 *
 * Example Express mount:
 *   const express = require("express");
 *   const app = express();
 *   app.use(express.json());
 *   const createCheckoutSessionHandler = require("./create-checkout-session");
 *   app.post("/api/create-checkout-session", createCheckoutSessionHandler);
 */

const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * TRUSTED SERVER-SIDE PRODUCT CATALOG
 * Only products defined here can be purchased.
 * The frontend may send product IDs/slugs, but pricing is rebuilt here.
 */
const PRODUCT_CATALOG = {
  "employee-notice-documentation": {
    id: "employee-notice-documentation",
    name: "Employee Notice Documentation System",
    unit_amount: 29700,
    description:
      "Notice tracking, acknowledgment forms, distribution logs, and employee communication documentation."
  },
  "termination-documentation-system": {
    id: "termination-documentation-system",
    name: "Termination Documentation System",
    unit_amount: 29700,
    description:
      "Separation records, termination communications, acknowledgment templates, and internal documentation workflows."
  },
  "payroll-documentation-readiness": {
    id: "payroll-documentation-readiness",
    name: "Payroll Documentation Readiness",
    unit_amount: 29700,
    description:
      "Wage records, paystub compliance, payroll communication tracking, and payroll documentation workflows."
  },
  "new-hire-documentation-system": {
    id: "new-hire-documentation-system",
    name: "New Hire Documentation System",
    unit_amount: 29700,
    description:
      "I-9 compliance, onboarding records, acknowledgment tracking, and employee file workflows."
  },
  "work-schedule-documentation": {
    id: "work-schedule-documentation",
    name: "Work Schedule Documentation",
    unit_amount: 19700,
    description:
      "Shift tracking, schedule changes, on-call documentation, and work schedule communication records."
  }
};

/**
 * TRUSTED BUNDLE CATALOG
 * Bundle price is server-defined, not client-defined.
 */
const BUNDLE_CATALOG = {
  "full-suite-upgrade": {
    id: "full-suite-upgrade",
    name: "Full Suite Upgrade",
    unit_amount: 59700,
    description:
      "Includes Payroll Documentation Readiness, New Hire Documentation System, and Work Schedule Documentation.",
    includes: [
      "payroll-documentation-readiness",
      "new-hire-documentation-system",
      "work-schedule-documentation"
    ]
  }
};

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function normalizeCart(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Missing request body.");
  }

  const baseProduct = body.baseProduct;
  const addOns = Array.isArray(body.addOns) ? body.addOns : [];
  const bundleActive = Boolean(body.bundleActive);

  if (!baseProduct || typeof baseProduct !== "object") {
    throw new Error("Missing base product.");
  }

  if (!baseProduct.slug || typeof baseProduct.slug !== "string") {
    throw new Error("Base product slug missing.");
  }

  return {
    baseProductSlug: baseProduct.slug,
    addOnSlugs: addOns
      .map((item) => item && item.slug)
      .filter((slug) => typeof slug === "string"),
    bundleActive
  };
}

function buildLineItemsFromCart(cart) {
  const lineItems = [];

  const base = PRODUCT_CATALOG[cart.baseProductSlug];
  if (!base) {
    throw new Error(`Unknown base product: ${cart.baseProductSlug}`);
  }

  lineItems.push({
    price_data: {
      currency: "usd",
      product_data: {
        name: base.name,
        description: base.description
      },
      unit_amount: base.unit_amount
    },
    quantity: 1
  });

  if (cart.bundleActive) {
    const bundle = BUNDLE_CATALOG["full-suite-upgrade"];
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: bundle.name,
          description: bundle.description
        },
        unit_amount: bundle.unit_amount
      },
      quantity: 1
    });
    return lineItems;
  }

  const dedupedAddOns = [...new Set(cart.addOnSlugs)];

  for (const slug of dedupedAddOns) {
    // Prevent duplicate purchase of base product as add-on
    if (slug === cart.baseProductSlug) continue;

    const product = PRODUCT_CATALOG[slug];
    if (!product) {
      throw new Error(`Unknown add-on product: ${slug}`);
    }

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
          description: product.description
        },
        unit_amount: product.unit_amount
      },
      quantity: 1
    });
  }

  return lineItems;
}

function buildClientReferenceId(cart) {
  const parts = [
    cart.baseProductSlug,
    cart.bundleActive ? "bundle" : "nobundle",
    Date.now().toString()
  ];
  return parts.join("_").slice(0, 200);
}

module.exports = async function createCheckoutSessionHandler(req, res) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "Missing STRIPE_SECRET_KEY environment variable."
      });
    }

    if (!process.env.APP_BASE_URL) {
      return res.status(500).json({
        error: "Missing APP_BASE_URL environment variable."
      });
    }

    const cart = normalizeCart(req.body);
    const line_items = buildLineItemsFromCart(cart);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${process.env.APP_BASE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/cart?product=${encodeURIComponent(
        cart.baseProductSlug
      )}`,
      client_reference_id: buildClientReferenceId(cart),
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: true
      },
      allow_promotion_codes: true,
      metadata: {
        base_product_slug: cart.baseProductSlug,
        bundle_active: String(cart.bundleActive),
        add_on_slugs: cart.addOnSlugs.join(",")
      }
    });

    return res.status(200).json({
      url: session.url
    });
  } catch (error) {
    console.error("Stripe Checkout Session error:", error);

    return res.status(500).json({
      error: error.message || "Unable to create checkout session."
    });
  }
};
