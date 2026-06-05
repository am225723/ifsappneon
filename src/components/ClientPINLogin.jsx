import { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Key } from 'lucide-react';
import TokenLogin from './TokenLogin';

const ClientPINLogin = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useTokenLogin, setUseTokenLogin] = useState(false);

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setPin(value);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== 6) {
      setError('Please enter a 5-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call the onLogin function passed from parent
      const success = await onLogin(pin);
      
      if (!success) {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      console.error('💥 Login error:', err);
      
      // Show more detailed error in development, generic message in production
      const errorMessage = import.meta.env.DEV
        ? `Login error: ${err.message}` 
        : 'An error occurred. Please try again.';
      
      setError(errorMessage);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinBoxClick = () => {
    // Focus on the input when clicking on any PIN box
    document.getElementById('pin-input').focus();
  };

  // If token login is selected, show token login component
  if (useTokenLogin) {
    return (
      <TokenLogin 
        onLogin={onLogin} 
        onSwitchToPIN={() => setUseTokenLogin(false)}
      />
    );
  }

  // Show PIN login interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-100 to-emerald-50/50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Internal Family Systems" className="w-28 h-auto mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 text-lg">
            Enter your personal PIN to continue your healing journey
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit}>
            {/* PIN Input Section */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-4 text-center">
                Enter Your 6-Digit PIN
              </label>
              
              {/* Visual PIN Boxes */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    onClick={() => handlePinBoxClick(index)}
                    className={`w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold cursor-pointer transition-all duration-200 ${
                      pin.length > index
                        ? 'border-amber-600 bg-amber-50 text-amber-700'
                        : 'border-gray-300 bg-gray-50 text-gray-400'
                    }`}
                  >
                    {pin.length > index ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Hidden Input */}
              <input
                id="pin-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={handlePinChange}
                className="w-full text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg p-3 focus:border-amber-600 focus:outline-none"
                placeholder="000000"
                autoFocus
                maxLength={6}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pin.length !== 6 || loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center ${
                pin.length === 6 && !loading
                  ? 'bg-gradient-to-r from-amber-600 to-emerald-700 text-white hover:from-amber-700 hover:to-emerald-800 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Access My Curriculum
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-2">
              Your PIN was provided by your advisor
            </p>
            <button className="text-amber-700 hover:text-amber-800 font-semibold text-sm">
              Forgot your PIN? Contact support
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setUseTokenLogin(true)}
            className="inline-flex items-center space-x-2 text-gray-500 hover:text-amber-700 font-medium transition-colors duration-200"
          >
            <Key className="w-4 h-4" />
            <span>Login with Token Instead</span>
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Your data is secure and private
          </p>
        </div>
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

export default ClientPINLogin;