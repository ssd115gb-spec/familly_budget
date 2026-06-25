import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { apiRequest } from "../api";
import { LogIn, Mail, Lock, AlertCircle, Loader2, Wallet } from "lucide-react";

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAppStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("auth.invalidCredentials")),
    password: z.string().min(6, t("auth.invalidCredentials")),
    rememberMe: z.boolean().optional(),
  });

  type LoginForm = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      setSession(response.user, response.accessToken);
      
      // Save in localStorage if "remember me" is ticked
      if (data.rememberMe) {
        localStorage.setItem("remember_email", data.email);
      } else {
        localStorage.removeItem("remember_email");
      }

      navigate("/");
    } catch (err: any) {
      setServerError(err.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-violet-50/50 via-indigo-50/30 to-white">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center"
      >
        <div className="inline-flex justify-center items-center gap-3 font-display font-black text-3.5xl tracking-tight mb-3">
          <div className="p-2 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-500/10">
            <Wallet className="w-8 h-8 stroke-[2.2]" />
          </div>
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{t("common.appName")}</span>
        </div>
        <h2 className="text-center text-2xl font-black font-display text-stone-900 tracking-tight">
          {t("auth.login")}
        </h2>
        <p className="mt-1.5 text-sm text-stone-500 font-medium font-display">
          {t("common.appName")} &mdash; {t("dashboard.title")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-10 px-6 sm:px-10 shadow-xl shadow-stone-100/80 rounded-3xl border border-stone-150">
          {serverError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-3 text-rose-700 text-xs font-semibold font-display">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 stroke-[2.2]" />
              <span>{serverError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label className="block text-xs font-bold font-display uppercase tracking-wider text-stone-500 mb-1.5">
                {t("auth.email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-5 h-5 stroke-[1.8]" />
                </div>
                <input
                  type="email"
                  {...register("email")}
                  className={`block w-full ps-11 pe-4 py-3 rounded-2xl border bg-stone-50/50 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                    errors.email
                      ? "border-rose-300 focus:ring-rose-500"
                      : "border-stone-200 focus:border-violet-500"
                  }`}
                  placeholder="ex@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium font-display">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold font-display uppercase tracking-wider text-stone-500 mb-1.5">
                {t("auth.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-5 h-5 stroke-[1.8]" />
                </div>
                <input
                  type="password"
                  {...register("password")}
                  className={`block w-full ps-11 pe-4 py-3 rounded-2xl border bg-stone-50/50 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                    errors.password
                      ? "border-rose-300 focus:ring-rose-500"
                      : "border-stone-200 focus:border-violet-500"
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium font-display">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  {...register("rememberMe")}
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-stone-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="ms-2 block text-xs text-stone-600 cursor-pointer font-bold font-display uppercase tracking-wide"
                >
                  {t("auth.rememberMe")}
                </label>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider font-display transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-violet-500/10"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5 stroke-[2.2]" />
                  <span>{t("auth.login")}</span>
                </>
              )}
            </button>
          </form>

          {/* Nav link */}
          <div className="mt-6 text-center border-t border-stone-150 pt-5">
            <Link
              to="/register"
              className="text-xs font-bold uppercase tracking-wider font-display text-violet-600 hover:text-violet-500 transition-colors"
            >
              {t("auth.noAccount")}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
