import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { supabase } from "@/Utils/types/supabaseClient";
import { useState, useEffect } from "react";
import LoginSidePanelImg from '@/assets/Images/GarageInventoryLoginImg2.png';
import { useDispatch } from 'react-redux';
import { setUser, clearUser, setLoading, setError } from '@/redux/features/userSlice';
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

// Define allModules to match RoleManagement for consistency
const allModules = [
  "Dashboard",
  "Supplier Management",
  "Store Management",
  "Purchase Order Management",
  "Inventory Management",
  "Sales Invoice",
  "Reports",
  "Purchase Order Approvals",
  "Returns Management",
  "Returns Eligible",
  "Category Master",
  "Customer Master",
  "Item Configurator",
  "Item Master",
  "Workflow Configuration",
  "Audit Trail",
  "Role Management",
  "Users",
  "Administration",
];

// Helper function to convert module name to camelCase URL path
const moduleToPath = (module: string): string => {
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Session data:", session);

        if (session && session.user) {
          const storedUserData = localStorage.getItem('userData');
          const storedRoleName = localStorage.getItem('roleName');
          console.log("Stored userData:", storedUserData, "Stored roleName:", storedRoleName);

          if (storedUserData && storedRoleName) {
            const userData = JSON.parse(storedUserData);
            dispatch(setUser(userData));
            if (storedRoleName.toLowerCase() === 'auditor') {
              console.log("Redirecting Auditor to /dashboard/audit-trial (from stored data)");
              navigate("/dashboard/audit-trial");
            } else {
              // Fetch permissions to determine first module
              const { data: permData, error: permError } = await supabase
                .from('role_module_permissions')
                .select('module_key, allowed')
                .eq('role_id', userData.role_id);

              if (permError) {
                console.warn('role_module_permissions fetch failed:', permError.message || permError);
                navigate("/dashboard");
                return;
              }

              const permissions = (permData || []).reduce((acc: any, p: any) => {
                acc[p.module_key] = p.allowed;
                return acc;
              }, {} as Record<string, boolean>);

              // Find the first allowed module in the order of allModules
              const firstModule = allModules.find(module => permissions[module] === true);
              // Handle Dashboard case to avoid /dashboard/dashboard
              const redirectPath = firstModule ? (firstModule === "Dashboard" ? "/dashboard" : `/dashboard/${moduleToPath(firstModule)}`) : "/dashboard";
              console.log(`Redirecting to ${redirectPath} (from stored data)`);
              navigate(redirectPath);
            }
          } else {
            // Fetch user details
            const { data: userDetails, error: userError } = await supabase
              .from('user_mgmt')
              .select(`
                *,
                company_master (*)
              `)
              .eq('id', session.user.id)
              .single();

            if (!userError && userDetails) {
              // Fetch role name
              let roleName = null;
              if (userDetails.role_id) {
                const { data: roleData, error: roleError } = await supabase
                  .from('role_master')
                  .select('name')
                  .eq('id', userDetails.role_id)
                  .single();
                if (!roleError && roleData) {
                  roleName = roleData.name || '';
                  localStorage.setItem('roleName', roleName);
                } else {
                  console.error("Error fetching role name:", roleError);
                }
              }

              const userData = {
                id: session.user.id,
                email: session.user.email ?? '',
                email_confirmed: session.user.email_confirmed_at ? true : false,
                created_at: session.user.created_at,
                last_sign_in: session.user.last_sign_in_at,
                first_name: userDetails?.first_name || null,
                last_name: userDetails?.last_name || null,
                role_id: userDetails?.role_id || null,
                role_name: roleName,
                status: userDetails?.status || null,
                is_active: userDetails?.is_active,
                company_id: userDetails?.company_id || null,
                company_data: userDetails?.company_master || null,
                full_name: userDetails?.first_name && userDetails?.last_name
                  ? `${userDetails.first_name} ${userDetails.last_name}`
                  : null,
              };

              if (userData.is_active) {
                localStorage.setItem('userData', JSON.stringify(userData));
                dispatch(setUser(userData as any));
                console.log("Fetched roleName:", roleName, "Role ID:", userDetails.role_id);
                if (roleName?.toLowerCase() === 'auditor') {
                  console.log("Redirecting Auditor to /dashboard/audit-trial");
                  navigate("/dashboard/audit-trial");
                } else {
                  // Fetch permissions to determine first module
                  const { data: permData, error: permError } = await supabase
                    .from('role_module_permissions')
                    .select('module_key, allowed')
                    .eq('role_id', userDetails?.role_id as string);

                  if (permError) {
                    console.warn('role_module_permissions fetch failed:', permError.message || permError);
                    navigate("/dashboard");
                    return;
                  }

                  const permissions = (permData || []).reduce((acc: any, p: any) => {
                    acc[p.module_key] = p.allowed;
                    return acc;
                  }, {} as Record<string, boolean>);

                  // Find the first allowed module in the order of allModules
                  const firstModule = allModules.find(module => permissions[module] === true);
                  // Handle Dashboard case to avoid /dashboard/dashboard
                  const redirectPath = firstModule ? (firstModule === "Dashboard" ? "/dashboard" : `/dashboard/${moduleToPath(firstModule)}`) : "/dashboard";
                  console.log(`Redirecting to ${redirectPath}`);
                  navigate(redirectPath);
                }
              } else {
                await supabase.auth.signOut();
                localStorage.removeItem('userData');
                localStorage.removeItem('roleName');
                toast.error("Account is inactive");
              }
            } else {
              console.error("Error fetching user details:", userError);
              await supabase.auth.signOut();
              localStorage.removeItem('userData');
              localStorage.removeItem('roleName');
            }
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        dispatch(setError(error.message));
      } else {
        localStorage.removeItem('userData');
        localStorage.removeItem('roleName');
        dispatch(clearUser());
        navigate("/");
        toast.success("Logged out successfully");
      }
    } catch (error) {
      console.error("Unexpected logout error:", error);
      dispatch(setError('An unexpected error occurred during logout'));
    }
  };

  const checkUserActiveStatus = async(email: string) => {
    try {
      // Fetch user using email id
      const { data: user, error } = await supabase
        .from("user_mgmt")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        return {
          valid: false,
          message: "User does not exist or has been removed.",
        };
      }

      // Check for deleted users
      if (user.is_active === false) {
        return {
          valid: false,
          message: "This account no longer exists. Please contact the administrator.",
        };
      }

      // Check for inactive users
      if (String(user.status).toLowerCase() === "inactive") {
        return {
          valid: false,
          message: `This account is ${user.failed_attempts === 3 ? `locked` : `inactive`}. Please contact the administrator.`,
        };
      }

      // Valid user
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

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      // Check user active status before login
      const statusCheck = await checkUserActiveStatus(data.email);
      if (!statusCheck.valid) {
        toast.error(statusCheck.message || "Unable to log in.");
        dispatch(setError(statusCheck.message || "Account not allowed to log in"));
        return;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        let errorMessage = "Login failed. Please try again.";
        switch (error.message) {
          case "Invalid login credentials":
            errorMessage = "Invalid email or password. Please check your credentials.";
            break;
          case "Email not confirmed":
            errorMessage = "Please confirm your email address before logging in.";
            break;
          case "Too many requests":
            errorMessage = "Too many login attempts. Please try again later.";
            break;
          default:
            errorMessage = error.message;
        }
        toast.error(errorMessage);
        dispatch(setError(errorMessage));
        return;
      }

      if (authData.user) {
        const { data: userDetails, error: userError } = await supabase
          .from('user_mgmt')
          .select(`
            *,
            company_master (*)
          `)
          .eq('id', authData.user.id)
          .single();

        if (userError) {
          console.error("Error fetching user details:", userError);
          toast.error("Error fetching user profile. Please try again.");
          dispatch(setError("Error fetching user profile"));
          return;
        }

        if (!userDetails) {
          toast.error("User profile not found. Please contact admin.");
          dispatch(setError("User profile not found"));
          return;
        }

        // Fetch role name
        let roleName = null;
        if (userDetails.role_id) {
          const { data: roleData, error: roleError } = await supabase
            .from('role_master')
            .select('name')
            .eq('id', userDetails.role_id)
            .single();
          if (!roleError && roleData) {
            roleName = roleData.name as string;
            localStorage.setItem('roleName', roleName);
          } else {
            console.error("Error fetching role name:", roleError);
          }
        }

        const userData = {
          id: authData.user.id,
          email: authData.user.email ?? '',
          email_confirmed: authData.user.email_confirmed_at ? true : false,
          created_at: authData.user.created_at,
          last_sign_in: authData.user.last_sign_in_at,
          first_name: userDetails?.first_name || null,
          last_name: userDetails?.last_name || null,
          role_id: userDetails?.role_id || null,
          role_name: roleName,
          status: userDetails?.status || null,
          is_active: userDetails?.is_active,
          company_id: userDetails?.company_id || null,
          company_data: userDetails?.company_master || null,
          full_name: userDetails?.first_name && userDetails?.last_name
            ? `${userDetails.first_name} ${userDetails.last_name}`
            : null,
          image: userDetails?.image || null,
        };

        if (userData.is_active) {
          localStorage.setItem('userData', JSON.stringify(userData));
          dispatch(setUser(userData as any));
          toast.success("Login successful! Welcome back.");
          console.log("Fetched roleName:", roleName, "Role ID:", userDetails.role_id);
          if (roleName?.toLowerCase() === 'auditor') {
            console.log("Redirecting Auditor to /dashboard/audit-trial");
            navigate("/dashboard/audit-trial");
          } else {
            // Fetch permissions to determine first module
            const { data: permData, error: permError } = await supabase
              .from('role_module_permissions')
              .select('module_key, allowed')
              .eq('role_id', userDetails?.role_id as string);

            if (permError) {
              console.warn('role_module_permissions fetch failed:', permError.message || permError);
              navigate("/dashboard");
              return;
            }

            const permissions = (permData || []).reduce((acc: any, p: any) => {
              acc[p.module_key] = p.allowed;
              return acc;
            }, {} as Record<string, boolean>);

            // Find the first allowed module in the order of allModules
            const firstModule = allModules.find(module => permissions[module] === true);
            // Handle Dashboard case to avoid /dashboard/dashboard
            const redirectPath = firstModule ? (firstModule === "Dashboard" ? "/dashboard" : `/dashboard/${moduleToPath(firstModule)}`) : "/dashboard";
            console.log(`Redirecting to ${redirectPath}`);
            navigate(redirectPath);
          }
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