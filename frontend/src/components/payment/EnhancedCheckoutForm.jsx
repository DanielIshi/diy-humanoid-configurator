// Enhanced Checkout Form für Issue #5
// React Component für Stripe/PayPal Integration mit verbesserter UX

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent,
  Button,
  Alert,
  AlertDescription,
  RadioGroup,
  RadioGroupItem,
  Label,
  Input,
  Spinner,
  Progress
} from '@/components/ui';
import { 
  CreditCard, 
  Building2, 
  Zap, 
  Shield, 
  Check,
  AlertTriangle,
  ExternalLink,
  Euro
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../../hooks/useAuth';

// Initialize Stripe
let stripePromise = null;

const EnhancedCheckoutForm = ({ 
  order, 
  onPaymentSuccess, 
  onPaymentError,
  className = "" 
}) => {
  const { user } = useAuth();
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe_card');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStep, setPaymentStep] = useState(1); // 1: Method Selection, 2: Payment Details, 3: Confirmation

  // Load payment configuration on mount
  useEffect(() => {
    loadPaymentConfiguration();
  }, []);

  // Load available payment methods when order changes
  useEffect(() => {
    if (order && paymentConfig) {
      loadPaymentMethods();
    }
  }, [order, paymentConfig]);

  const loadPaymentConfiguration = async () => {
    try {
      const response = await fetch('/api/payments-v2/config');
      const data = await response.json();
      
      if (data.success) {
        setPaymentConfig(data.config);
        
        // Initialize Stripe
        if (data.config.stripePublishableKey) {
          stripePromise = loadStripe(data.config.stripePublishableKey);
        }
      } else {
        throw new Error('Failed to load payment configuration');
      }
    } catch (err) {
      setError('Zahlungskonfiguration konnte nicht geladen werden');
      console.error('Payment config error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch(
        `/api/payments-v2/methods?amount=${order.total}&currency=${order.currency || 'EUR'}`
      );
      const data = await response.json();
      
      if (data.success) {
        setPaymentMethods(data.paymentMethods);
        
        // Set default payment method
        if (data.paymentMethods.length > 0) {
          setSelectedPaymentMethod(data.paymentMethods[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    }
  };

  const getPaymentMethodIcon = (methodId) => {
    switch (methodId) {
      case 'stripe_card':
        return <CreditCard className="h-5 w-5" />;
      case 'stripe_sepa':
        return <Building2 className="h-5 w-5" />;
      case 'stripe_giropay':
        return <Zap className="h-5 w-5" />;
      case 'stripe_sofort':
        return <Zap className="h-5 w-5" />;
      case 'paypal':
        return <div className="h-5 w-5 bg-blue-600 text-white text-xs flex items-center justify-center font-bold">PP</div>;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getPaymentMethodDescription = (methodId) => {
    switch (methodId) {
      case 'stripe_card':
        return 'Visa, Mastercard, American Express';
      case 'stripe_sepa':
        return 'SEPA-Lastschrift (nur EU)';
      case 'stripe_giropay':
        return 'Online-Banking Deutschland';
      case 'stripe_sofort':
        return 'Sofortüberweisung';
      case 'paypal':
        return 'PayPal, Kreditkarte über PayPal';
      default:
        return '';
    }
  };

  const handlePaymentMethodChange = (methodId) => {
    setSelectedPaymentMethod(methodId);
    setError(null);
  };

  const proceedToPayment = () => {
    setPaymentStep(2);
  };

  const backToMethodSelection = () => {
    setPaymentStep(1);
    setError(null);
  };

  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6 mr-2" />
          <span>Lade Zahlungsoptionen...</span>
        </CardContent>
      </Card>
    );
  }

  if (!paymentConfig) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Zahlungssystem nicht verfügbar. Bitte versuchen Sie es später erneut.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Zahlung</h3>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">256-bit SSL verschlüsselt</span>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="mt-4">
          <Progress 
            value={(paymentStep / 3) * 100} 
            className="w-full h-2"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className={paymentStep >= 1 ? 'text-blue-600 font-medium' : ''}>
              Zahlungsart
            </span>
            <span className={paymentStep >= 2 ? 'text-blue-600 font-medium' : ''}>
              Bezahlung
            </span>
            <span className={paymentStep >= 3 ? 'text-blue-600 font-medium' : ''}>
              Bestätigung
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Gesamtbetrag:</span>
            <span className="text-2xl font-bold text-blue-600">
              <Euro className="h-5 w-5 inline mr-1" />
              {order.total?.toFixed(2)} {order.currency || 'EUR'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Bestellung #{order.id}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Payment Method Selection */}
        {paymentStep === 1 && (
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Zahlungsart wählen</h4>
            
            <RadioGroup 
              value={selectedPaymentMethod} 
              onValueChange={handlePaymentMethodChange}
              className="space-y-3"
            >
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex items-center space-x-3 flex-1 cursor-pointer">
                    {getPaymentMethodIcon(method.id)}
                    <div className="flex-1">
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-600">
                        {getPaymentMethodDescription(method.id)}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button 
              onClick={proceedToPayment}
              className="w-full"
              size="lg"
              disabled={!selectedPaymentMethod}
            >
              Weiter zur Zahlung
            </Button>
          </div>
        )}

        {/* Step 2: Payment Processing */}
        {paymentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-lg">Zahlung abschließen</h4>
              <Button variant="ghost" size="sm" onClick={backToMethodSelection}>
                Zurück
              </Button>
            </div>

            {selectedPaymentMethod.startsWith('stripe') && (
              <StripePaymentForm
                order={order}
                paymentMethod={selectedPaymentMethod}
                onSuccess={onPaymentSuccess}
                onError={onPaymentError}
                processing={processing}
                setProcessing={setProcessing}
              />
            )}

            {selectedPaymentMethod === 'paypal' && paymentConfig.paypalClientId && (
              <PayPalPaymentForm
                order={order}
                clientId={paymentConfig.paypalClientId}
                environment={paymentConfig.environment}
                onSuccess={onPaymentSuccess}
                onError={onPaymentError}
                processing={processing}
                setProcessing={setProcessing}
              />
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-4 w-4" />
            <span>Ihre Zahlung ist sicher geschützt</span>
          </div>
          <p>
            Wir speichern keine Kreditkartendaten. Alle Transaktionen werden über 
            sichere, PCI-DSS zertifizierte Payment-Provider abgewickelt.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Stripe Payment Form Component
const StripePaymentForm = ({ order, paymentMethod, onSuccess, onError, processing, setProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payments-v2/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          currency: order.currency || 'EUR',
          paymentMethod: paymentMethod,
          customerInfo: {
            email: user.email,
            name: user.name
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setClientSecret(data.paymentIntent.clientSecret);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      onError(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: user.name,
          email: user.email,
        },
      }
    });

    setProcessing(false);

    if (error) {
      onError(error.message);
    } else {
      onSuccess({
        paymentIntentId: paymentIntent.id,
        provider: 'stripe'
      });
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement options={cardElementOptions} />
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Spinner className="h-4 w-4 mr-2" />
            Verarbeite Zahlung...
          </>
        ) : (
          `${order.total?.toFixed(2)} € bezahlen`
        )}
      </Button>
    </form>
  );
};

// PayPal Payment Form Component
const PayPalPaymentForm = ({ order, clientId, environment, onSuccess, onError, processing, setProcessing }) => {
  const { user } = useAuth();

  const initialOptions = {
    clientId: clientId,
    currency: order.currency || 'EUR',
    intent: 'capture',
    environment: environment === 'production' ? 'production' : 'sandbox'
  };

  const createOrder = async (data, actions) => {
    try {
      const response = await fetch('/api/payments-v2/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          currency: order.currency || 'EUR',
          paymentMethod: 'paypal',
          customerInfo: {
            email: user.email,
            name: user.name
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.paymentIntent.id;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      onError(err.message);
    }
  };

  const onApprove = async (data, actions) => {
    setProcessing(true);
    
    try {
      const response = await fetch('/api/payments-v2/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          paymentIntentId: data.orderID,
          provider: 'paypal'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        onSuccess({
          paymentIntentId: data.orderID,
          provider: 'paypal'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const onErrorHandler = (err) => {
    onError('PayPal-Zahlung fehlgeschlagen: ' + err.message);
  };

  return (
    <PayPalScriptProvider options={initialOptions}>
      <PayPalButtons
        style={{ layout: 'vertical' }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onErrorHandler}
        disabled={processing}
      />
    </PayPalScriptProvider>
  );
};

// Main component with Stripe Elements wrapper
const EnhancedCheckoutWithProviders = (props) => {
  if (stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <EnhancedCheckoutForm {...props} />
      </Elements>
    );
  }
  
  return <EnhancedCheckoutForm {...props} />;
};

export default EnhancedCheckoutWithProviders;