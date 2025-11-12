import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useState, useEffect } from "react";
import LoginSidePanelImg from '@/assets/Images/GarageInventoryLoginImg2.png';
import { useDispatch } from 'react-redux';
import { setUser, clearUser, setLoading, setError } from '@/redux/features/userSlice';
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";
import { authService } from '@/services/authService';

export function LoginForm({ className, ...props }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const persistSession = (authPayload) => {
    localStorage.setItem('accessToken', authPayload.accessToken);
    localStorage.setItem('refreshToken', authPayload.refreshToken);
    localStorage.setItem('userData', JSON.stringify(authPayload.user));
    if (authPayload.user.role_name) {
      localStorage.setItem('roleName', authPayload.user.role_name);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('roleName');
  };

  const bootstrapSession = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        clearSession();
        dispatch(clearUser());
        return;
      }
      const { data } = await authService.me();
      if (data) {
        const mappedUser = {
          id: data.id,
          email: data.email,
          email_confirmed: true,
          created_at: new Date().toISOString(),
          last_sign_in: new Date().toISOString(),
          first_name: data.firstName ?? null,
          last_name: data.lastName ?? null,
          role_id: null,
          role_name: typeof data.role === 'string' ? data.role : data.role?.name ?? null,
          status: data.status ?? 'active',
          is_active: data.isActive ?? true,
          company_id: data.companyId ?? data.company?.id ?? null,
          company_data: data.company ?? null,
          full_name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email,
        };
        localStorage.setItem('userData', JSON.stringify(mappedUser));
        if (mappedUser.role_name) {
          localStorage.setItem('roleName', mappedUser.role_name);
        }
        dispatch(setUser(mappedUser));
        navigate("/dashboard");
      } else {
        clearSession();
        dispatch(clearUser());
      }
    } catch (error) {
      clearSession();
      dispatch(clearUser());
      if (error instanceof Error) {
        console.warn("Session bootstrap error:", error.message);
      }
    }
  };

  useEffect(() => {
    bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') ?? undefined;
      await authService.logout(refreshToken);
    } catch {
      // ignore
    } finally {
      clearSession();
      dispatch(clearUser());
      navigate("/");
      toast.success("Logged out successfully");
    }
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      const { data: authData } = await authService.login(formData);
      if (!authData) {
        throw new Error('Invalid login response');
      }

      const mappedUser = {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed: true,
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
        first_name: authData.user.firstName ?? null,
        last_name: authData.user.lastName ?? null,
        role_id: null,
        role_name: authData.user.role,
        status: authData.user.status ?? 'active',
        is_active: authData.user.isActive ?? true,
        company_id: authData.user.companyId ?? null,
        company_data: authData.user.company ?? null,
        full_name: `${authData.user.firstName ?? ''} ${authData.user.lastName ?? ''}`.trim() || authData.user.email,
      };

      persistSession({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        user: mappedUser,
      });

      dispatch(setUser(mappedUser));

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      const message = error?.message || "Invalid email or password.";
      toast.error(message);
      dispatch(setError(message));
      clearSession();
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100", className)} {...props}>
      <div className="flex flex-col md:flex-row bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl overflow-hidden w-full max-w-4xl transition-all duration-300">
        <div className="hidden md:block md:w-1/2">
          <img
            src={LoginSidePanelImg}
            alt="Login Illustration"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500">
              Enter your credentials to access your inventory management dashboard.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                  {...register('email', {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address",
                    },
                  })}
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <button
                  type="button"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                  {...register('password', {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters long",
                    },
                  })}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 transition-all"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-gray-500">
              By signing in, you agree to our <span className="text-indigo-600 font-medium">Terms</span> and <span className="text-indigo-600 font-medium">Privacy Policy</span>.
            </div>
          </form>
        </div>
      </div>
      <ForgotPasswordDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}


