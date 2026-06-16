import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../redux/slices/authSlice';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Redirect if already authenticated
  const from = location.state?.from?.pathname || '/';
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Show API error if exists
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const onSubmit = async (data) => {
    dispatch(loginUser(data));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full space-y-6"
    >
      <div className="space-y-2 text-center md:text-left">
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Sign In
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Enter your credentials to access your workspaces.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-450 uppercase tracking-wider block mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address',
              },
            })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.email && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.email.message}
            </span>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
              Password
            </label>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.password && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.password.message}
            </span>
          )}
        </div>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4.5 py-3 text-xs font-extrabold text-white shadow-md shadow-emerald-500/10 transition-all duration-250 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            'Sign In'
          )}
        </motion.button>
      </form>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-semibold pt-2">
        Don’t have an account?{' '}
        <Link
          to="/signup"
          className="font-extrabold text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors"
        >
          Create one
        </Link>
      </div>
    </motion.div>
  );
};

export default Login;

