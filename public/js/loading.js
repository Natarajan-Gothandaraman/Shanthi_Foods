// Check if this is the first visit or if loading screen should be shown
function shouldShowLoadingScreen() {
  const lastVisit = localStorage.getItem('lastVisit');
  const now = new Date().getTime();
  const oneHour = 60 * 60 * 1000;
  
  // Show loading screen if first visit or more than 1 hour since last visit
  if (!lastVisit || (now - parseInt(lastVisit)) > oneHour) {
    localStorage.setItem('lastVisit', now.toString());
    return true;
  }
  return false;
}

// Show loading screen if needed
function initLoadingScreen() {
  if (shouldShowLoadingScreen()) {
    window.location.href = '/loading.html';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLoadingScreen);
