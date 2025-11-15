import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, Shield, Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const raw = localStorage.getItem('userData');
  const user = raw ? JSON.parse(raw) : null;

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    let mounted = true;
    const checkAccess = async () => {
      setLoading(true);
      try {
        // Static: if a user exists, allow access
        const allowed = !!user;
        if (mounted) setHasAccess(allowed);
      } catch (err) {
        console.error('Permission check failed:', err);
        if (mounted) setHasAccess(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkAccess();
    return () => { mounted = false; };
  }, [user?.id]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (hasAccess) return <Outlet />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
            <p className="text-red-100">Insufficient Permissions</p>
          </div>
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-slate-600 leading-relaxed">
                You don't have the required permissions to access this module. 
                Please contact your administrator or check your account privileges.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <button className="w-full border border-slate-300 hover:border-slate-400 text-slate-700 py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Request Access
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 text-center">
                Need help? Contact{" "}
                <a href="mailto:support@company.com" className="text-blue-600 hover:text-blue-700 font-medium">
                  support@company.com
                </a>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">Error Code: 403 • Module Access Denied</p>
        </div>
      </div>
    </div>
  );
}


