const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCT_CATALOG = {
  "penalty-response-documentation": {
    id: "penalty-response-documentation",
    name: "Penalty Response Documentation System",
    unit_amount: 49700,
    description: "Response templates, audit checklist, and compliance documentation workflows."
  },
  "beneficial-ownership-filing-preparation": {
    id: "beneficial-ownership-filing-preparation",
    name: "Beneficial Ownership Filing Preparation",
    unit_amount: 49700,
    description: "BOI preparation worksheets, filing organization, and documentation tracking."
  },
  "termination-documentation-system": {
    id: "termination-documentation-system",
    name: "Termination Documentation System",
    unit_amount: 49700,
    description: "Separation records, final pay tracking, and termination documentation workflows."
  },
  "employee-notice-documentation": {
    id: "employee-notice-documentation",
    name: "Employee Notice Documentation System",
    unit_amount: 29700,
    description: "Notice tracking, acknowledgment forms, and distribution logs."
  },
  "workplace-incident-documentation": {
    id: "workplace-incident-documentation",
    name: "Workplace Incident Documentation System",
    unit_amount: 39700,
    description: "Incident reports, witness statements, and incident tracking workflows."
  },
  "contractor-documentation-system": {
    id: "contractor-documentation-system",
    name: "Contractor Documentation System",
    unit_amount: 39700,
    description: "Contractor records, insurance verification, W-9 tracking, and classification documentation."
  },
  "new-hire-documentation": {
    id: "new-hire-documentation",
    name: "New Hire Documentation System",
    unit_amount: 29700,
    description: "I-9 compliance, onboarding records, acknowledgment tracking, and employee file workflows."
  },
  "license-renewal-documentation": {
    id: "license-renewal-documentation",
    name: "License Renewal Documentation System",
    unit_amount: 39700,
    description: "License inventory, renewal checklists, deadline calendars, and submission tracking."
  },
  "payroll-documentation-readiness": {
    id: "payroll-documentation-readiness",
    name: "Payroll Documentation Readiness",
    unit_amount: 29700,
    description: "Wage records, paystub compliance, payroll communication tracking, and payroll documentation workflows."
  },
  "ny-filing-preparation": {
    id: "ny-filing-preparation",
    name: "NY Filing Preparation System",
    unit_amount: 34700,
    description: "Submission tracking, deadline calendars, and filing preparation workflows."
  },
  "paystub-documentation-kit": {
    id: "paystub-documentation-kit",
    name: "Paystub Documentation Kit",
    unit_amount: 9700,
    description: "Paystub review checklist, compliance notes, and correction tracking."
  },
  "prenatal-leave-documentation": {
    id: "prenatal-leave-documentation",
    name: "Prenatal Leave Documentation System",
    unit_amount: 19700,
    description: "Leave request forms, policy templates, tracking logs, and payroll coordination notes."
  },
  "work-schedule-documentation": {
    id: "work-schedule-documentation",
    name: "Work Schedule Documentation",
    unit_amount: 19700,
    description: "Shift tracking, schedule changes, on-call documentation, and work schedule communication records."
  },
  "trapped-at-work-documentation": {
    id: "trapped-at-work-documentation",
    name: "Trapped at Work Documentation System",
    unit_amount: 19700,
    description: "Meal provision logs, overnight shift policies, and compliance tracking."
  }
};

const ADD_ON_CATALOG = {
  "payroll-documentation-readiness": {
    id: "payroll-documentation-readiness",
    name: "Payroll Documentation Readiness",
    unit_amount: 29700,
    description: "Wage records, paystub compliance, payroll communication tracking, and payroll documentation workflows."
  },
  "new-hire-documentation": {
    id: "new-hire-documentation",
    name: "New Hire Documentation System",
    unit_amount: 29700,
    description: "I-9 compliance, onboarding records, acknowledgment tracking, and employee file workflows."
  },
  "work-schedule-documentation": {
    id: "work-schedule-documentation",
    name: "Work Schedule Documentation",
    unit_amount: 19700,
    description: "Shift tracking, schedule changes, on-call documentation, and work schedule communication records."
  }
};

const BUNDLE_CATALOG = {
  "full-suite-upgrade": {
    id: "full-suite-upgrade",
    name: "Complete Compliance Bundle (Upgrade)",
    unit_amount: 59700,
    description: "Includes Payroll Documentation Readiness, New Hire Documentation System, and Work Schedule Documentation.",
    includes: [
      "payroll-documentation-readiness",
      "new-hire-documentation",
      "work-schedule-documentation"
    ]
  }
};

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
    if (slug === cart.baseProductSlug) continue;

    const product = ADD_ON_CATALOG[slug];
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
      cancel_url: `${process.env.APP_BASE_URL}/cart?product=${encodeURIComponent(cart.baseProductSlug)}`,
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
