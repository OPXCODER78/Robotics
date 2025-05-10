import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Initialize Supabase client with optimized settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please add them to your .env file.');
}

// Enhanced client with optimized fetch and caching settings
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.token',
    },
    global: {
      headers: {
        'x-application-name': 'modern-blog-platform'
      },
      fetch: (...args) => {
        // Use native fetch with keep-alive and cache optimizations
        return fetch(...args);
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      timeout: 30000 // Increase timeout for better reliability
    }
  }
);

// Cache for storing frequently accessed data
const cache = new Map<string, {data: any, timestamp: number}>();
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

// Helper function to get current user with cache
export async function getCurrentUser() {
  const cacheKey = 'current_user';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  
  if (user) {
    cache.set(cacheKey, {
      data: user,
      timestamp: Date.now()
    });
  }
  
  return user;
}

// Helper function to get user role with cache
export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const cacheKey = `user_role_${user.id}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error getting user role:', error);
    return null;
  }
  
  const role = data?.role || 'user';
  
  cache.set(cacheKey, {
    data: role,
    timestamp: Date.now()
  });
  
  return role;
}

// Optimized database query function with caching
export async function queryWithCache<T>(
  key: string,
  queryFn: () => Promise<{data: T | null, error: any}>,
  ttl = CACHE_TTL
): Promise<T | null> {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const { data, error } = await queryFn();
  
  if (error) {
    console.error(`Error executing cached query ${key}:`, error);
    return null;
  }
  
  if (data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  return data;
}

// Function to prefetch data that will likely be needed soon
export async function prefetchData(keys: string[], queryFns: (() => Promise<any>)[]) {
  return Promise.allSettled(
    keys.map((key, index) => {
      return queryWithCache(key, queryFns[index]);
    })
  );
}

// Clear cache for specific keys or all cache
export function clearCache(keys?: string[]) {
  if (!keys) {
    cache.clear();
    return;
  }
  
  keys.forEach(key => cache.delete(key));
}

// Clear cache on sign out
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    clearCache();
  }
});