const Stripe = require('stripe');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Get Stripe secret key from environment variable
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Parse the request body
    const { lineItems } = JSON.parse(event.body);
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://broadlocal.com/thank-you',
      cancel_url: 'https://broadlocal.com/cart',
      metadata: {
        source: 'cart_page'
      }
    });

    // Return the session URL
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
    
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
