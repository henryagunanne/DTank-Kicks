import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { getStripePromise } from '@/lib/stripe';

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}

function CheckoutForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment could not be completed.');
      toast.error(error.message || 'Payment could not be completed.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
      toast.success('Payment completed successfully.');
    } else {
      onError('Your payment is still processing. Please check your order status.');
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-full bg-gold py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground disabled:opacity-60"
      >
        {submitting ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  );
}

export function PaymentForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    setStripePromise(getStripePromise());
  }, []);

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
        <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
}
