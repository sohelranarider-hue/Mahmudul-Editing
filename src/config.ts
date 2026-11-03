export const API_BASE_URL = 
  import.meta.env.VITE_API_URL || ''; 
// এখানে যদি URL খালি থাকে (''), তাহলে এটি অ্যাপের নিজের ডোমেইনেই ব্যাকএন্ড খুঁজবে (অর্থাৎ GitHub Pages-এর জন্য এটি আপাতত খালিই থাকবে)।
// যখন Render-এ হোস্ট করবেন, তখন এখানে আপনার Render-এর দেওয়া URL টি বসিয়ে দেবেন।
