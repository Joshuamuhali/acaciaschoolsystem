import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  School, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Users,
  BookOpen,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import schoolLogo from '@/assets/school-logo.png';
import boyImage from '@/assets/boy.jpg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          const from = location.state?.from?.pathname || '/dashboard';
          window.location.href = from;
        }, 1200);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-100 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-full blur-3xl opacity-30"></div>
        {/* Animated dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-cyan-300 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-500"></div>
        <div className="absolute bottom-20 right-20 w-4 h-4 bg-cyan-400 rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-2xl lg:max-w-5xl">
          {/* Logo Section - Spans Full Width */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <motion.img
              src={schoolLogo}
              alt="Acacia Country School"
              className="w-32 h-32 lg:w-40 lg:h-40 object-contain mx-auto"
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              whileHover={{ scale: 1.05, rotate: 5 }}
            />
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* Left Side - Boy Image (Desktop Only) */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <motion.img
                src={boyImage}
                alt="Student"
                className="w-full h-full max-h-[600px] object-cover rounded-3xl shadow-2xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                whileHover={{ scale: 1.02 }}
              />
            </motion.div>

            {/* Right Side - Login Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ y: -8 }}
              className="transition-transform duration-300"
            >
              <Card className="border-0 shadow-3xl bg-white/98 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-8 lg:p-12">
                  <AnimatePresence mode="wait">
                    {isSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="text-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          className="mb-8"
                        >
                          <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto" />
                        </motion.div>
                        <motion.h1
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="text-4xl font-bold text-gray-800 mb-3"
                        >
                          Welcome Back!
                        </motion.h1>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                          className="text-gray-600 text-lg"
                        >
                          Redirecting to your dashboard...
                        </motion.p>
                      </motion.div>
                    ) : (
                      <>
                        <AnimatePresence>
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className="mb-8"
                            >
                              <Alert className="border-red-200 bg-red-50 rounded-xl">
                                <AlertDescription className="text-red-800 font-medium">
                                  {error}
                                </AlertDescription>
                              </Alert>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="text-center mb-10"
                        >
                          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-3xl mb-6 shadow-lg">
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 10, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                              className="h-10 w-10 text-emerald-600"
                            >
                              <Lock className="h-10 w-10 text-emerald-600" />
                            </motion.div>
                          </div>
                          <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-3xl font-bold text-gray-800 mb-2"
                          >
                            Sign In
                          </motion.h2>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="text-gray-600"
                          >
                            Enter your credentials to access the portal
                          </motion.p>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-7">
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="space-y-3"
                      >
                        <Label htmlFor="email" className="text-base font-bold text-gray-700">Email Address</Label>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="relative group"
                        >
                          <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <motion.input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className="pl-14 h-14 border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 bg-gray-50 focus:bg-white rounded-2xl transition-all duration-300 w-full text-lg font-medium placeholder-gray-400"
                            required
                            disabled={loading}
                            whileFocus={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          />
                        </motion.div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="space-y-3"
                      >
                        <Label htmlFor="password" className="text-base font-bold text-gray-700">Password</Label>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="relative group"
                        >
                          <Lock className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <motion.input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="pl-14 pr-14 h-14 border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 bg-gray-50 focus:bg-white rounded-2xl transition-all duration-300 w-full text-lg font-medium placeholder-gray-400"
                            required
                            disabled={loading}
                            whileFocus={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          />
                          <motion.button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            disabled={loading}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <AnimatePresence mode="wait">
                              {showPassword ? (
                                <motion.div
                                  key="hide"
                                  initial={{ rotate: -90 }}
                                  animate={{ rotate: 0 }}
                                  exit={{ rotate: 90 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <EyeOff className="h-6 w-6" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="show"
                                  initial={{ rotate: 90 }}
                                  animate={{ rotate: 0 }}
                                  exit={{ rotate: -90 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Eye className="h-6 w-6" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </motion.div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                            disabled={loading}
                            className="w-5 h-5"
                          />
                          <Label htmlFor="remember" className="text-base text-gray-600 font-medium">Remember me</Label>
                        </div>
                        <motion.a
                          href="#"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.7 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-base text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          Forgot password?
                        </motion.a>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      className="pt-4"
                    >
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="submit"
                          className="w-full h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl"
                          disabled={loading}
                        >
                          <AnimatePresence mode="wait">
                            {loading ? (
                              <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="flex items-center justify-center">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="h-6 w-6 mr-3 border-2 border-white border-t-transparent rounded-full"
                                  />
                                  Signing in...
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="submit"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="flex items-center justify-center">
                                  Sign In
                                  <motion.div
                                    initial={{ x: 0 }}
                                    animate={{ x: 8 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    exit={{ x: 0 }}
                                  >
                                    <ArrowRight className="h-6 w-6 ml-3" />
                                  </motion.div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                      </motion.div>
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
