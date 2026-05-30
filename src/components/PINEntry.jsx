import { useState, useEffect, useRef } from 'react';
import { Lock, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

const PINEntry = ({ onSubmit }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = (value, index) => {
    if (value.length > 1) return; // Only allow single digits
    
    const newPin = pin.split('');
    newPin[index] = value;
    const updatedPin = newPin.join('');
    setPin(updatedPin);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await onSubmit(pin);
      if (success) {
        setSuccess(true);
        setTimeout(() => {
          // Navigation will be handled by the parent component
        }, 1000);
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const digits = pastedData.split('');
    const newPin = Array(6).fill('');
    digits.forEach((digit, index) => {
      newPin[index] = digit;
    });
    setPin(newPin.join(''));
    if (digits.length > 0) {
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-700 via-emerald-800 to-stone-800">
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-amber-600 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              {success ? (
                <Shield className="w-10 h-10 text-white" />
              ) : (
                <Lock className="w-10 h-10 text-white" />
              )}
            </div>
            
            {success ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Access Granted</h2>
                <p className="text-gray-600">Welcome to the Admin Dashboard</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Access</h2>
                <p className="text-gray-600">Enter your 6-digit PIN to continue</p>
              </>
            )}
          </div>

          {!success && (
            <>
              {/* PIN Input */}
              <div className="mb-6">
                <div className="flex justify-center space-x-3 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="1"
                      value={pin[index] || ''}
                      onChange={(e) => handlePinChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-300 ${
                        error
                          ? 'border-red-500 bg-red-50'
                          : pin[index]
                          ? 'border-amber-600 bg-amber-50 text-amber-700'
                          : 'border-gray-300 bg-white hover:border-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                      } outline-none`}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>

                {/* Show/Hide PIN Toggle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                  >
                    {showPin ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Hide PIN</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Show PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || pin.length !== 6}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform ${
                  isSubmitting || pin.length !== 6
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-600 to-emerald-700 text-white hover:from-amber-700 hover:to-emerald-800 hover:scale-105 hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Unlock Dashboard'
                )}
              </button>

              {/* Hint */}
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-700 text-center">
                  <span className="font-semibold">Hint:</span> Default PIN is 123456
                </p>
              </div>
            </>
          )}
        </div>

        {/* Security Notice */}
        {!success && (
          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              This area is restricted to authorized personnel only
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default PINEntry;