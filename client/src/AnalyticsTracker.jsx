import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Check if the gtag function exists on the window object
    if (window.gtag) {

      // Send a 'page_view' event to Google Analytics
      window.gtag('event', 'page_view', {
        'page_path': location.pathname + location.search, // The new path
        'page_location': window.location.href,          // The full URL
        'page_title': document.title                    // The current page title
      });

    }
  }, [location]); // This effect runs every time the 'location' changes

  // This component doesn't render any HTML
  return null;
};

export default AnalyticsTracker;