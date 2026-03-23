import os
import stripe
from decimal import Decimal

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:3000/parent/payments?success=true")
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "http://localhost:3000/parent/payments?canceled=true")

stripe.api_key = STRIPE_SECRET_KEY


def create_checkout_session(
    parent_id: int,
    student_id: int,
    batch_id: int,
    amount: float | Decimal,
    currency: str,
    billing_month: str,
    batch_name: str,
    student_name: str,
) -> stripe.checkout.Session:
    """Create a Stripe Checkout Session for a monthly batch payment."""
    unit_amount = int(round(float(amount) * 100))
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": currency,
                    "product_data": {
                        "name": f"{batch_name} - {billing_month}",
                        "description": f"Monthly fee for {student_name}",
                    },
                    "unit_amount": unit_amount,
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        success_url=STRIPE_SUCCESS_URL,
        cancel_url=STRIPE_CANCEL_URL,
        metadata={
            "parent_id": str(parent_id),
            "student_id": str(student_id),
            "batch_id": str(batch_id),
            "billing_month": billing_month,
        },
    )
    return session


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    """Verify and parse a Stripe webhook event."""
    event = stripe.Webhook.construct_event(
        payload, sig_header, STRIPE_WEBHOOK_SECRET
    )
    return event
