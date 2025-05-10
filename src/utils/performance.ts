import { useEffect } from 'react';

// Optimize data loading with preload hints
export function usePreloadResources(resources: string[]) {
  useEffect(() => {
    resources.forEach(resource => {
      // Resource hints for faster loading
      const link = document.createElement('link');
      if (resource.endsWith('.js')) {
        link.rel = 'preload';
        link.as = 'script';
      } else if (resource.includes('fonts') || resource.endsWith('.woff2') || resource.endsWith('.woff')) {
        link.rel = 'preload';
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (resource.endsWith('.css')) {
        link.rel = 'preload';
        link.as = 'style';
      } else {
        // Default to fetch priority for API endpoints or other resources
        link.rel = 'preconnect';
      }
      link.href = resource;
      document.head.appendChild(link);
    });

    return () => {
      resources.forEach(resource => {
        const links = document.querySelectorAll(`link[href="${resource}"]`);
        links.forEach(link => link.remove());
      });
    };
  }, [resources]);
}

// IntersectionObserver-based lazy loading
export function createLazyLoader(
  selector: string, 
  callback: (element: Element) => void,
  options: IntersectionObserverInit = { rootMargin: '200px' }
): () => void {
  let observer: IntersectionObserver | null = null;

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  // Initialize the observer
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    // Clean up any previous observer
    cleanup();
    
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer?.unobserve(entry.target);
        }
      });
    }, options);

    document.querySelectorAll(selector).forEach(el => {
      observer?.observe(el);
    });
  }

  return cleanup;
}

// Performance measurement helpers
export function measurePerformance(name: string, startMark = `${name}_start`, endMark = `${name}_end`) {
  if (typeof performance === 'undefined') return () => {};
  
  performance.mark(startMark);
  
  return () => {
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    
    const entries = performance.getEntriesByName(name);
    if (entries.length) {
      const duration = entries[0].duration;
      console.log(`${name} took ${duration.toFixed(2)}ms`);
      return duration;
    }
    return 0;
  };
}

// Connection-aware loading
export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'medium';
  }
  
  const connection = (navigator as any).connection;
  
  if (!connection) return 'medium';
  
  if (connection.saveData) {
    return 'slow';
  }
  
  const effectiveType = connection.effectiveType || '';
  
  if (effectiveType.includes('2g') || effectiveType.includes('slow')) {
    return 'slow';
  }
  
  if (effectiveType.includes('3g') || effectiveType.includes('4g')) {
    return 'medium';
  }
  
  return 'fast';
}

// App optimization based on connection speed
export function getOptimizedImageQuality() {
  const speed = getConnectionSpeed();
  
  if (speed === 'slow') return 60;
  if (speed === 'medium') return 80;
  return 90;
}

// Memory-efficient resource management
export function useMemoryOptimization(cleanupFn: () => void) {
  useEffect(() => {
    // Priority for interactive elements
    return () => {
      try {
        cleanupFn();
      } catch (e) {
        console.error('Error in memory cleanup:', e);
      }
    };
  }, [cleanupFn]);
} 