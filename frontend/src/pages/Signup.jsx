import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { signupUser } from '../redux/slices/authSlice';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show error from API
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const onSubmit = (data) => {
    dispatch(signupUser(data));
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Create Account
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Get started with your collaborative workspace today.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            {...register('name', { required: 'Name is required' })}
            className="w-full rounded-xl border border-slate-205/65 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.name && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.name.message}
            </span>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
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
            className="w-full rounded-xl border border-slate-205/65 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.email && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.email.message}
            </span>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            Password
          </label>
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
            className="w-full rounded-xl border border-slate-205/65 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.password && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.password.message}
            </span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4.5 py-3 text-xs font-extrabold text-white shadow-md shadow-emerald-500/10 transition-all duration-250 cursor-pointer disabled:opacity-50 hover:scale-[1.015] active:scale-[0.985]"
        >
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-semibold pt-2">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-extrabold text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default Signup;

