import { Suspense, lazy, useEffect, ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { prefetchData, supabase } from './lib/supabase';
import { measurePerformance } from './utils/performance';

// Add custom type for component with preload method
interface PreloadableComponent<T = any> extends React.LazyExoticComponent<ComponentType<T>> {
  preload: () => Promise<{ default: ComponentType<T> }>;
}

// Optimized lazy loading with custom preloading
const lazyWithPreload = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<any> => {
  const Component = lazy(factory) as unknown as PreloadableComponent;
  Component.preload = factory;
  return Component;
};

// Route-based components with preloading capabilities
const Home = lazyWithPreload(() => import('./pages/Home'));
const PostDetail = lazyWithPreload(() => import('./pages/PostDetail'));
const Category = lazyWithPreload(() => import('./pages/Category'));
const Search = lazyWithPreload(() => import('./pages/Search'));
const Login = lazyWithPreload(() => import('./pages/auth/Login'));
const Register = lazyWithPreload(() => import('./pages/auth/Register'));
const ForgotPassword = lazyWithPreload(() => import('./pages/auth/ForgotPassword'));
const Dashboard = lazyWithPreload(() => import('./pages/admin/Dashboard'));
const PostList = lazyWithPreload(() => import('./pages/admin/posts/PostList'));
const PostEditor = lazyWithPreload(() => import('./pages/admin/posts/PostEditor'));
const CategoryList = lazyWithPreload(() => import('./pages/admin/categories/CategoryList'));
const CommentModeration = lazyWithPreload(() => import('./pages/admin/comments/CommentModeration'));
const Profile = lazyWithPreload(() => import('./pages/user/Profile'));
const NotFound = lazyWithPreload(() => import('./pages/NotFound'));

// Preload critical routes immediately
setTimeout(() => {
  Home.preload();
  Login.preload();
}, 1000);

// Route change listener for predictive loading
function RouteChangeListener() {
  const location = useLocation();
  
  useEffect(() => {
    // Measure navigation performance
    const end = measurePerformance('navigation');
    
    // Intelligently preload related routes based on current route
    if (location.pathname === '/') {
      // On home, preload most likely next pages
      PostDetail.preload();
      Category.preload();
      
      // Also prefetch top posts data from Supabase
      prefetchData(
        ['top_posts', 'featured_posts'],
        [
          () => Promise.resolve(supabase.from('posts').select('*').eq('is_featured', true).limit(5)),
          () => Promise.resolve(supabase.from('posts').select('*').order('view_count', { ascending: false }).limit(10))
        ]
      );
    }
    
    if (location.pathname.startsWith('/posts/')) {
      // When viewing a post, preload related components
      Profile.preload();
      
      // Prefetch related posts data
      const slug = location.pathname.split('/').pop();
      if (slug) {
        prefetchData(
          [`post_${slug}_comments`],
          [() => Promise.resolve(supabase.from('comments').select('*').eq('post_id', slug))]
        );
      }
    }
    
    if (location.pathname.startsWith('/admin')) {
      // Admin section preloads
      Dashboard.preload();
      PostList.preload();
    }
    
    return end;
  }, [location]);
  
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteChangeListener />
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
            <LoadingSpinner fullScreen />
          </div>
        }>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="posts/:slug" element={<PostDetail />} />
              <Route path="category/:slug" element={<Category />} />
              <Route path="search" element={<Search />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Auth routes */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route index element={<Navigate to="/auth/login" replace />} />
            </Route>

            {/* User routes (protected) */}
            <Route path="/user" element={<ProtectedRoute><PublicLayout /></ProtectedRoute>}>
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Admin routes (protected + role) */}
            <Route 
              path="/admin" 
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </RoleProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="posts" element={<PostList />} />
              <Route path="posts/new" element={<PostEditor />} />
              <Route path="posts/edit/:id" element={<PostEditor />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="comments" element={<CommentModeration />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          toastOptions={{
            // Optimized toast rendering
            style: { 
              background: 'var(--toast-bg)',
              color: 'var(--toast-text)', 
            },
          }} 
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;