import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const periodEndSeconds = subscription.items.data[0]?.current_period_end;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      subscription_status: subscription.status,
      current_period_end: periodEndSeconds
        ? new Date(periodEndSeconds * 1000).toISOString()
        : null,
    })
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn(`No profile found for Stripe customer ${customerId}`);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to process webhook" },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}
