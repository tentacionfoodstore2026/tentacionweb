import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { BusinessDetail } from './pages/BusinessDetail';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { MerchantPanel } from './pages/MerchantPanel';
import { AdminPanel } from './pages/AdminPanel';
import { DeliveryPanel } from './pages/DeliveryPanel';
import { Promotions } from './pages/Promotions';
import { MaintenanceMode } from './pages/MaintenanceMode';
import { AboutUs } from './pages/AboutUs';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Faq } from './pages/Faq';
import { useAuthStore } from './store/useStore';
import { Chatbot } from './components/Chatbot';
import { supabase } from './lib/supabase';

const PrivateRoute = ({ children, role }: { children: React.ReactNode; role?: string | string[] }) => {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.role === 'super_admin') return <>{children}</>;
  if (role) {
    if (Array.isArray(role)) {
      if (!role.includes(user.role)) return <Navigate to="/" />;
    } else {
      if (user.role !== role) return <Navigate to="/" />;
    }
  }
  return <>{children}</>;
};

const GoogleMapsLoader = () => {
  const { portalSettings } = useAuthStore();
  
  useEffect(() => {
    if (portalSettings?.google_maps_key && !(window as any).google) {
      console.log('[Maps] Loading Google Maps API...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${portalSettings.google_maps_key}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [portalSettings?.google_maps_key]);

  return null;
};

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { portalSettings, user } = useAuthStore();
  const location = useLocation();
  
  // Allow admins and specifically the login page to always be accessible
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isLoginPage = location.pathname === '/login';

  if (portalSettings?.maintenance_mode && !isAdmin && !isLoginPage) {
    return <MaintenanceMode />;
  }

  return <>{children}</>;
};

// Component to handle auth state changes and routing
const AuthHandler = () => {
  const { setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = React.useRef(location);

  // Keep locationRef updated with the current location
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    // Fetch Portal Settings
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .single();
        
        if (!error && data) {
          useAuthStore.getState().setPortalSettings(data);
        }
      } catch (err) {
        console.error('[App] Error fetching portal settings:', err);
      }
    };
    fetchSettings();

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata);
        
        // Redirect based on role ONLY if they just logged in and ARE currently on the login page
        // Using locationRef ensures we have the current path at the time of the event
        if (_event === 'SIGNED_IN' && locationRef.current.pathname === '/login') {
          supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
            const isSuperAdmin = session.user.email?.toLowerCase() === 'joseluisquiroga76@gmail.com';
            if (data?.role === 'comercio') navigate('/merchant');
            else if (data?.role === 'admin' || data?.role === 'super_admin' || data?.role === 'cocina' || data?.role === 'cajero' || isSuperAdmin) navigate('/admin');
            else if (data?.role === 'repartidor') navigate('/delivery');
            else navigate('/');
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchProfile = async (userId: string, email: string, userMetadata?: any) => {
    // Only set global loading if we don't have a user yet
    // This prevents component remounting during background token refreshes
    if (!useAuthStore.getState().user) {
      setLoading(true);
    }
    const isSuperAdminEmail = email.toLowerCase() === 'joseluisquiroga76@gmail.com';
    try {
      if ((import.meta as any).env.DEV) console.log('[Auth] Fetching profile for:', email);
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet (trigger may not have run), create it
        if ((import.meta as any).env.DEV) console.log('[Auth] Profile not found, creating...');
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            name: userMetadata?.name || email.split('@')[0],
            role: isSuperAdminEmail ? 'super_admin' : 'user'
          })
          .select()
          .single();
        
        if (insertError) {
          if ((import.meta as any).env.DEV) console.error('[Auth] Error creating profile (RLS policy may be missing):', insertError);
          // Fallback: set user from auth metadata only
          setUser({
            id: userId,
            name: userMetadata?.name || email.split('@')[0],
            email: email,
            role: isSuperAdminEmail ? 'super_admin' : 'user',
            claimedPromotions: userMetadata?.claimedPromotions || [],
          });
          return;
        }
        data = newData;
        if ((import.meta as any).env.DEV) console.log('[Auth] Profile created successfully');
      } else if (error) {
        if ((import.meta as any).env.DEV) console.error('[Auth] Error fetching profile (check RLS SELECT policy):', error);
        throw error;
      } else {
        if ((import.meta as any).env.DEV) console.log('[Auth] Profile found:', data?.role);
      }

      // Auto-upgrade to super_admin if email matches but role is wrong
      if (data && isSuperAdminEmail && data.role !== 'super_admin') {
        if ((import.meta as any).env.DEV) console.log('[Auth] Upgrading to super_admin...');
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'super_admin' })
          .eq('id', userId)
          .select()
          .single();
        
        if (!updateError && updatedData) {
          data = updatedData;
        } else if (updateError) {
          if ((import.meta as any).env.DEV) console.error('[Auth] Error upgrading to super_admin:', updateError);
          data.role = 'super_admin';
        }
      }

      if (data) {
        // Check if account is inactive
        if (data.status === 'inactive') {
          if ((import.meta as any).env.DEV) console.warn('[Auth] Account is inactive, logging out');
          await supabase.auth.signOut();
          setUser(null);
          alert('Tu cuenta ha sido desactivada. Por favor, contacta con el administrador.');
          return;
        }

        const finalRole = isSuperAdminEmail ? 'super_admin' : data.role;
        setUser({
          id: data.id,
          name: data.name || email.split('@')[0],
          email: email,
          role: finalRole as any,
          businessId: data.business_id,
          claimedPromotions: userMetadata?.claimedPromotions || [],
          status: data.status as any,
          phone: data.phone,
          address: data.address,
          avatarUrl: data.avatar_url
        });
      }
    } catch (error) {
      if ((import.meta as any).env.DEV) console.error('[Auth] Critical error in fetchProfile:', error);
      // Fallback for super admin email
      if (isSuperAdminEmail) {
        setUser({
          id: userId,
          name: userMetadata?.name || email.split('@')[0],
          email: email,
          role: 'super_admin',
          claimedPromotions: userMetadata?.claimedPromotions || [],
        });
      } else {
        setLoading(false);
      }
    }
  };

  return null;
};

export default function App() {
  return (
    <Router>
      <AuthHandler />
      <GoogleMapsLoader />
      <MaintenanceGuard>
        <div className="min-h-screen bg-surface font-sans selection:bg-primary/30 selection:text-dark">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/business/:id" element={<BusinessDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/faq" element={<Faq />} />
            
            <Route path="/checkout" element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            } />
            
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />

            <Route path="/merchant" element={
              <PrivateRoute role="comercio">
                <MerchantPanel />
              </PrivateRoute>
            } />

            <Route path="/admin" element={
              <PrivateRoute role={['admin', 'cocina', 'cajero']}>
                <AdminPanel />
              </PrivateRoute>
            } />
            <Route path="/super-admin" element={
              <PrivateRoute role="super_admin">
                <AdminPanel />
              </PrivateRoute>
            } />

            <Route path="/delivery" element={
              <PrivateRoute role="repartidor">
                <DeliveryPanel />
              </PrivateRoute>
            } />
          </Routes>
          <Chatbot />
        </div>
      </MaintenanceGuard>
    </Router>
  );
}
