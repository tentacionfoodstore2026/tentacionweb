import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { useAuthStore } from './store/useStore';
import { Chatbot } from './components/Chatbot';
import { supabase } from './lib/supabase';

const PrivateRoute = ({ children, role }: { children: React.ReactNode; role?: string }) => {
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
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
};

// Component to handle auth state changes and routing
const AuthHandler = () => {
  const { setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
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
        // Redirect based on role if they just logged in
        if (_event === 'SIGNED_IN') {
          supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
            const isSuperAdmin = session.user.email?.toLowerCase() === 'joseluisquiroga76@gmail.com';
            if (data?.role === 'comercio') navigate('/merchant');
            else if (data?.role === 'admin' || data?.role === 'super_admin' || isSuperAdmin) navigate('/admin');
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
    setLoading(true);
    const isSuperAdminEmail = email.toLowerCase() === 'joseluisquiroga76@gmail.com';
    try {
      console.log('[Auth] Fetching profile for:', email);
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet (trigger may not have run), create it
        console.log('[Auth] Profile not found, creating...');
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
          console.error('[Auth] Error creating profile (RLS policy may be missing):', insertError);
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
        console.log('[Auth] Profile created successfully');
      } else if (error) {
        console.error('[Auth] Error fetching profile (check RLS SELECT policy):', error);
        throw error;
      } else {
        console.log('[Auth] Profile found:', data?.role);
      }

      // Auto-upgrade to super_admin if email matches but role is wrong
      if (data && isSuperAdminEmail && data.role !== 'super_admin') {
        console.log('[Auth] Upgrading to super_admin...');
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'super_admin' })
          .eq('id', userId)
          .select()
          .single();
        
        if (!updateError && updatedData) {
          data = updatedData;
        } else if (updateError) {
          console.error('[Auth] Error upgrading to super_admin:', updateError);
          data.role = 'super_admin';
        }
      }

      if (data) {
        // Check if account is inactive
        if (data.status === 'inactive') {
          console.warn('[Auth] Account is inactive, logging out');
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
          status: data.status as any
        });
      }
    } catch (error) {
      console.error('[Auth] Critical error in fetchProfile:', error);
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
      <div className="min-h-screen bg-surface font-sans selection:bg-primary/30 selection:text-dark">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/business/:id" element={<BusinessDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/promotions" element={<Promotions />} />
          
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
            <PrivateRoute role="admin">
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
    </Router>
  );
}
