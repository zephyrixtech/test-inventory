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

// Static data and helpers (no API)
const staticUsers = [
  {
    id: "1",
    email: "admin@example.com",
    first_name: "Admin",
    last_name: "User",
    role_id: "r1",
    status: "active",
    is_active: true,
    company_id: "c1",
    image: null,
    created_at: new Date().toISOString(),
  },
];

const staticRoles = [
  { id: "r1", name: "Administrator" },
  { id: "r2", name: "User" },
];

const getSession = async () => {
  // Static session: return whatever is in localStorage
  const storedUserData = localStorage.getItem('userData');
  if (!storedUserData) return { data: { session: null } };
  try {
    const user = JSON.parse(storedUserData);
    return { data: { session: { user } } };
  } catch {
    return { data: { session: null } };
  }
};

const fetchUsers = async () => {
  return { data: staticUsers };
};

const fetchRolesStatic = async () => {
  return { data: staticRoles };
};

const authenticateUser = async (email, _password) => {
  const user = staticUsers.find(u => u.email === email);
  if (!user) {
    return { data: null, error: { message: "Invalid email or password" } };
  }
  return { data: { user }, error: null };
};

// Helper function to convert module name to camelCase URL path
const moduleToPath = (module) => {
  if (module === "Dashboard") return "dashboard";
  return module
    .toLowerCase()
    .split(' ')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')
    .replace(/&/g, 'and');
};

export function LoginForm({ className, ...props }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if user is already logged in (static)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await getSession();
        const session = data?.session;

        if (session && session.user) {
          const storedUserData = localStorage.getItem('userData');
          const storedRoleName = localStorage.getItem('roleName');
          if (storedUserData && storedRoleName) {
            const userData = JSON.parse(storedUserData);
            dispatch(setUser(userData));
            navigate("/dashboard");
          } else {
            localStorage.removeItem('userData');
            localStorage.removeItem('roleName');
            dispatch(clearUser());
          }
        } else {
          localStorage.removeItem('userData');
          localStorage.removeItem('roleName');
          dispatch(clearUser());
        }
      } catch (error) {
        console.error("Session check error:", error);
        localStorage.removeItem('userData');
        localStorage.removeItem('roleName');
        dispatch(clearUser());
      }
    };

    checkSession();
  }, [navigate, dispatch]);

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
      localStorage.removeItem('userData');
      localStorage.removeItem('roleName');
      dispatch(clearUser());
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Unexpected logout error:", error);
      dispatch(setError('An unexpected error occurred during logout'));
    }
  };

  const checkUserActiveStatus = async(email) => {
    try {
      const { data: users } = await fetchUsers();
      const user = (users || []).find((u) => u.email === email);

      if (!user) {
        return {
          valid: false,
          message: "User does not exist or has been removed.",
        };
      }

      if (user.is_active === false) {
        return {
          valid: false,
          message: "This account no longer exists. Please contact the administrator.",
        };
      }

      if (String(user.status).toLowerCase() === "inactive") {
        return {
          valid: false,
          message: `This account is ${user.failed_attempts === 3 ? `locked` : `inactive`}. Please contact the administrator.`,
        };
      }

      return {
        valid: true,
      };
    } catch (err) {
      console.error("Error checking user active status:", err);
      return {
        valid: false,
        message: "An unexpected error occurred while verifying user status.",
      };
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      const statusCheck = await checkUserActiveStatus(data.email);
      if (!statusCheck.valid) {
        toast.error(statusCheck.message || "Unable to log in.");
        dispatch(setError(statusCheck.message || "Account not allowed to log in"));
        return;
      }

      const { data: authData, error } = await authenticateUser(data.email, data.password);

      if (error) {
        toast.error(error.message || "Invalid email or password. Please check your credentials.");
        dispatch(setError(error.message || "Login failed"));
        return;
      }

      if (authData?.user) {
        let roleName = null;
        if (authData.user.role_id) {
          const { data: rolesData } = await fetchRolesStatic();
          const role = rolesData.find((r) => r.id === authData.user.role_id);
          if (role) {
            roleName = role.name;
            localStorage.setItem('roleName', roleName);
          }
        }

        const userData = {
          id: authData.user.id,
          email: authData.user.email ?? '',
          email_confirmed: true,
          created_at: authData.user.created_at || new Date().toISOString(),
          last_sign_in: new Date().toISOString(),
          first_name: authData.user.first_name || null,
          last_name: authData.user.last_name || null,
          role_id: authData.user.role_id || null,
          role_name: roleName,
          status: authData.user.status || null,
          is_active: authData.user.is_active,
          company_id: authData.user.company_id || null,
          company_data: authData.user.company_data || null,
          full_name: authData.user.first_name && authData.user.last_name
            ? `${authData.user.first_name} ${authData.user.last_name}`
            : null,
          image: authData.user.image || null,
        };

        if (userData.is_active) {
          localStorage.setItem('userData', JSON.stringify(userData));
          dispatch(setUser(userData));
          toast.success("Login successful! Welcome back.");
          navigate("/dashboard");
        } else {
          dispatch(setError('Account is inactive'));
          toast.error("Login failed. Account is inactive.");
          await handleLogout();
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      dispatch(setError('An unexpected error occurred'));
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
        <div className="w-full md:w-1/2 p-8 sm:p-12">
          <div className="flex flex-col align-items-center space-y-4">
            <h1 className="text-3xl mt-5 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600">Enter your credentials to access your account</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={cn("font-medium", errors.email && "text-destructive")}
              >
                Email
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={cn(
                    "pl-10 h-12 rounded-lg transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20",
                    errors.email && "border-destructive focus-visible:ring-destructive"
                  )}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  })}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive mt-1 animate-slideDown">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={cn("font-medium", errors.password && "text-destructive")}
              >
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className={cn(
                    "pl-10 h-12 rounded-lg transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20",
                    errors.password && "border-destructive focus-visible:ring-destructive"
                  )}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters"
                    }
                  })}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive mt-1 animate-slideDown">{errors.password.message}</p>
              )}
            </div>
            <div className="flex justify-end mb-0">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                onClick={() => setIsDialogOpen(true)}
              >
                Forgot your password?
              </button>
            </div>
            <Button
              type="submit"
              className="w-full h-12 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </div>
      </div>
      <ForgotPasswordDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}


