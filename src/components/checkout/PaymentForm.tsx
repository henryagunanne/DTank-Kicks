import { useEffect, useState } from 'react';
import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout';
import { toast } from 'sonner';
import { getStripePromise } from '@/lib/stripe';

interface PaymentFormProps {
  clientSecret: string;
  orderId?: string | null;
  onSuccess: (confirmationId: string) => void;
  onError: (message: string) => void;
}

function CheckoutForm({ orderId, onSuccess, onError }: Omit<PaymentFormProps, 'clientSecret'>) {
  const checkoutResult = useCheckoutElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (checkoutResult.type !== 'success') {
      return;
    }

    const checkout = checkoutResult.checkout as {
      confirm: (options?: { returnUrl?: string }) => Promise<{ error?: { message?: string } }>;
    };

    setSubmitting(true);

    const { error } = await checkout.confirm({
      returnUrl: `${window.location.origin}/order/success?id=${encodeURIComponent(orderId || '')}`,
    });

    if (error) {
      onError(error.message || 'Payment could not be completed.');
      toast.error(error.message || 'Payment could not be completed.');
      setSubmitting(false);
      return;
    }

    onSuccess('checkout-session');
    toast.success('Payment is being processed.');
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={submitting || checkoutResult.type !== 'success'}
        className="w-full rounded-full bg-gold py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground disabled:opacity-60"
      >
        {submitting ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  );
}

export function PaymentForm({ clientSecret, orderId, onSuccess, onError }: PaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    setStripePromise(getStripePromise());
  }, []);

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <CheckoutElementsProvider stripe={stripePromise} options={{ clientSecret, elementsOptions: { appearance: { theme: 'stripe' } } } as any}>
        <CheckoutForm orderId={orderId} onSuccess={onSuccess} onError={onError} />
      </CheckoutElementsProvider>
    </div>
  );
}
