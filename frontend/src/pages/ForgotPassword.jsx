import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/forgotpassword', { email: data.email });
      if (response.data.success) {
        setSubmitted(true);
        toast.success('Password reset link sent to your email!');
      } else {
        toast.error(response.data.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || 'Error sending reset email'
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
          Reset Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {submitted
            ? 'Check your inbox for password reset instructions.'
            : 'Enter your email address and we will send you a link to reset your password.'}
        </p>
      </div>

      {!submitted ? (
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
              'Send Reset Link'
            )}
          </motion.button>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full mb-3">
            <Mail className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-650 dark:text-slate-350 text-center font-medium leading-relaxed">
            We have sent a password reset email. Please click the link in the email to set a new password.
          </p>
        </div>
      )}

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

export default ForgotPassword;
