import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../services/api';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await API.put(`/auth/resetpassword/${token}`, {
        password: data.password,
      });

      if (response.data.success) {
        toast.success('Password reset successfully! Please sign in with your new password.');
        navigate('/login');
      } else {
        toast.error(response.data.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || 'Failed to reset password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full space-y-6"
    >
      <div className="space-y-2 text-center md:text-left">
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Create New Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Please enter and confirm your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Password */}
        <div>
          <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-450 uppercase tracking-wider block mb-1.5">
            New Password
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
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.password && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.password.message}
            </span>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-3xs font-extrabold text-slate-500 dark:text-slate-450 uppercase tracking-wider block mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === password || 'Passwords do not match',
            })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input backdrop-blur-md placeholder-slate-400 transition-all duration-200"
          />
          {errors.confirmPassword && (
            <span className="text-3xs text-rose-500 mt-1.5 block font-bold">
              {errors.confirmPassword.message}
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
            'Reset Password'
          )}
        </motion.button>
      </form>

      <div className="pt-2 flex items-center justify-center">
        <Link
          to="/login"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Sign In
        </Link>
      </div>
    </motion.div>
  );
};

export default ResetPassword;
