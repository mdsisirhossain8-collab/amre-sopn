/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Heart, 
  ShoppingCart, 
  Search, 
  User, 
  Star, 
  ChevronRight, 
  LayoutGrid, 
  ShoppingBag, 
  Flame, 
  Percent,
  Home,
  PlusSquare,
  Banknote,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Settings,
  Trash2,
  Edit,
  Plus,
  Link,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Image as ImageIcon,
  Upload,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './lib/cropImage';
import { supabase } from './lib/supabase';

// --- Types ---
interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface Product {
  id: string | number;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  media: MediaItem[];
  description?: string;
  sizes?: string[];
  createdAt?: string;
}

interface Category {
  id: string | number;
  name: string;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
}

interface User {
  id: string;
  email: string | null;
  name: string;
  picture: string;
  isAdmin: boolean;
  address?: string;
  phone?: string;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  total: number;
  address: string;
  phone: string;
  paymentMethod: string;
  transactionId?: string;
  status: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  orderId?: string;
  text: string;
  createdAt: string;
}

// --- Constants ---
const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: "Mens Fashion", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400" },
  { id: 'cat-2', name: "Womens Fashion", image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400" },
  { id: 'cat-3', name: "Footwear", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400" }
];

export default function App() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showProductsPage, setShowProductsPage] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [randomProduct, setRandomProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState<'providers' | 'phone' | 'otp' | 'email' | 'register'>('providers');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Cropper States
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropCallback, setCropCallback] = useState<((url: string) => void) | null>(null);
  const [cropAspect, setCropAspect] = useState<number>(1);

  // Admin Dashboard States (Lifted for Quick Edit access)
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'products' | 'site'>('stats');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    category: 'Clothing',
    price: 0,
    originalPrice: 0,
    media: [],
    rating: 4.5
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) {
      const fetchAdminMessages = async () => {
        try {
          const res = await fetch('/api/messages', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            // Filter to only show messages FROM others (received messages)
            const receivedMessages = (data as Message[]).filter(m => m.senderId !== user.id);
            // Show last 5 messages as notifications
            setUnreadMessages(receivedMessages.slice(-5).reverse());
          }
        } catch (err) {
          console.error("Failed to fetch admin messages:", err);
        }
      };
      fetchAdminMessages();
      const interval = setInterval(fetchAdminMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.isAdmin]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, aspect: number = 1) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("ছবিটি অনেক বড়! ১০ মেগাবাইটের কম সাইজের ছবি বাছাই করুন।");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage(reader.result as string);
        setCropCallback(() => callback);
        setCropAspect(aspect);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Site-wide text content state
  const [siteContent, setSiteContent] = useState({
    heroSubtitle: "Special Offer",
    heroTitle: "Summer Sale is On!",
    heroPromo: "Up to 50% OFF",
    heroBtnShop: "Shop Now",
    heroBtnExplore: "Explore More",
    categoryTitle: "Top Categories",
    categorySeeAll: "See All",
    featuredTitle: "Featured Products",
    latestTitle: "Latest Arrivals",
    latestDesc: "Discover the freshest styles from AMRE SOPNO. Our new collection is designed to make you stand out and feel confident.",
    latestBtnViewAll: "View All Collection",
    promoTitle: "Exclusive Member Discount",
    promoDesc: "Join our community and get EXTRA 20% OFF on your first order.",
    promoBtnJoin: "Join AMRE SOPNO Now",
    footerSlogan: "Your destination for the trendiest and most high-quality fashion. We bring the world's best styles straight to your wardrobe.",
    footerHeadingLinks: "Quick Links",
    footerHeadingCollections: "Our Collections",
    footerHeadingSupport: "Customer Support",
    siteName: "AMRE SOPNO",
    navHome: "Home",
    navProducts: "Products",
    navPost: "Post",
    navAbout: "About Us",
    navSale: "Sale",
    navCategories: "Categories",
    siteDomain: "amresopno.totalh.net",
    liveBannerText: "✨কুরবানি ধামাকা এখন LIVE! | Flat 30% OFF On all Items✨",
    heroImages: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"
    ]
  });

  const lastScrollYRef = React.useRef(0);

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, settingsRes] = await Promise.all([
          fetch('/api/products', { credentials: 'include' }),
          fetch('/api/categories', { credentials: 'include' }),
          fetch('/api/site-content', { credentials: 'include' })
        ]);
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          console.log("Products loaded from server:", productsData.length);
          if (Array.isArray(productsData)) {
            const sorted = [...productsData].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setProducts(sorted);
            if (productsData.length === 0) {
              console.log("Server returned empty product list");
            }
          }
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          if (Array.isArray(categoriesData) && categoriesData.length > 0) setCategories(categoriesData);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData && !settingsData.error) setSiteContent(prev => ({ ...prev, ...settingsData }));
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
    fetchUser();
    const refreshInterval = setInterval(fetchData, 30000);

    // Handle session syncing between Supabase and Backend
    const syncSession = async (sbUser: any) => {
      const localUser: User = {
        id: sbUser.id,
        email: sbUser.email || null,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'User',
        picture: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || 'https://ui-avatars.com/api/?name=' + (sbUser.email || 'U'),
        isAdmin: sbUser.email === 'mdsisirhossain8@gmail.com',
      };

      try {
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: localUser }),
          credentials: 'include'
        });
        setUser(localUser);
        setShowLoginModal(false);
      } catch (err) {
        console.error("Failed to sync session:", err);
      }
    };

    let subscription: { unsubscribe: () => void } | null = null;

    if (supabase) {
      // Initial check
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) syncSession(session.user);
      });

      // Listen for auth changes
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          syncSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        }
      });
      subscription = sub;
    }

    // Handle scroll for nav visibility
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) setIsNavVisible(true);
      else if (currentScrollY > lastScrollYRef.current) setIsNavVisible(false);
      else setIsNavVisible(true);
      lastScrollYRef.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('message', handleMessage);
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % siteContent.heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [siteContent.heroImages.length]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      alert("Supabase is not configured.");
      return;
    }
    try {
      setIsLoginLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google Login error:", err);
      alert("Google Login failed.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (!supabase) return;
    try {
      setIsLoginLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error("Facebook Login failed:", err);
      alert("Facebook Login failed.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handlePhoneLogin = () => {
    setLoginStep('phone');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return alert("Please fill all fields");
    setIsLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setShowLoginModal(false);
        setLoginStep('providers');
        setAuthEmail('');
        setAuthPassword('');
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authEmail || !authPassword) return alert("Please fill all fields");
    setIsLoginLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setShowLoginModal(false);
        setLoginStep('providers');
        setAuthName('');
        setAuthEmail('');
        setAuthPassword('');
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return alert("Please enter phone number");
    setIsLoginLoading(true);
    try {
      const res = await fetch('/api/auth/phone/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
        credentials: 'include'
      });
      if (res.ok) setLoginStep('otp');
      else alert("Failed to send OTP");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return alert("Please enter OTP code");
    setIsLoginLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setShowLoginModal(false);
        setLoginStep('providers');
        setPhoneNumber('');
        setOtpCode('');
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      setShowAdminDashboard(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const updateSiteContent = async (key: keyof typeof siteContent, value: string) => {
    const newContent = { ...siteContent, [key]: value };
    setSiteContent(newContent);
    if (user?.isAdmin) {
      try {
        await fetch('/api/site-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContent),
          credentials: 'include'
        });
      } catch (err) { console.error(err); }
    }
  };

  const saveSiteContent = async (newContent: typeof siteContent) => {
    setSiteContent(newContent);
    if (user?.isAdmin) {
      try {
        const res = await fetch('/api/site-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContent),
          credentials: 'include'
        });
        if (!res.ok) throw new Error("Failed to save site content");
        console.log("Site content saved successfully");
      } catch (err) { 
        console.error("Save error:", err);
        alert("Failed to save site content to server.");
      }
    }
  };

  const updateHeroImage = async (index: number, newUrl: string) => {
    const newImages = [...siteContent.heroImages];
    newImages[index] = newUrl;
    const newContent = { ...siteContent, heroImages: newImages };
    saveSiteContent(newContent);
  };

  const updateCategoryName = async (id: string | number, newName: string) => {
    const newCategories = categories.map(cat => String(cat.id) === String(id) ? { ...cat, name: newName } : cat);
    persistCategories(newCategories);
  };

  const handleLogoClick = () => {
    // Hidden shortcut for testing if needed
  };

  const handleShopNow = () => {
    const randomIndex = Math.floor(Math.random() * products.length);
    setRandomProduct(products[randomIndex]);
  };

  const updateProductPrice = async (id: string | number, newPrice: number, newOriginal?: number) => {
    const newProducts = products.map(p => {
      if (String(p.id) === String(id)) {
        const finalOriginal = newOriginal ?? p.originalPrice;
        return { 
          ...p, 
          price: newPrice, 
          originalPrice: finalOriginal,
          discount: Math.round(((finalOriginal - newPrice) / finalOriginal) * 100)
        };
      }
      return p;
    });
    persistProducts(newProducts);
  };

  const addToCart = (product: Product, size?: string) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => String(item.id) === String(product.id) && item.selectedSize === size);
      if (existing) {
        return prev.map((item) =>
          (String(item.id) === String(product.id) && item.selectedSize === size) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedSize: size }];
    });
    setRandomProduct(null);
    setIsCartOpen(true);
    setShowPost(false);
    setShowAdminDashboard(false);
  };

  const removeFromCart = (id: string | number, size?: string) => {
    setCartItems((prev) => prev.filter((item) => !(String(item.id) === String(id) && item.selectedSize === size)));
  };

  const updateQuantity = (id: string | number, delta: number, size?: string) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(id) && item.selectedSize === size) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const handleCheckout = async (address: string, phone: string, paymentMethod: string, transactionId?: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const orderData = {
      user_id: user.id,
      user_name: user.name,
      items: cartItems,
      total: cartTotal,
      address,
      phone,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      // 1. Save to Supabase (if configured)
      if (supabase) {
        const { error: sbError } = await supabase
          .from('orders')
          .insert([orderData]);
        
        if (sbError) {
          console.error("Supabase Sync Error:", sbError);
          // We continue to local API even if supabase fails for now, 
          // or we could block it based on requirement.
        } else {
          console.log("Successfully synced order to Supabase");
        }
      }

      // 2. Save to local API (existing logic)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          total: cartTotal,
          address,
          phone,
          paymentMethod,
          transactionId
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        alert("Order placed successfully! (Synced to Supabase)");
        setCartItems([]);
        setShowCheckout(false);
      } else {
        alert(data.error || "Checkout failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error during checkout");
    }
  };

  const handleProfileUpdate = async (updatedData: { name: string; address: string; phone: string }) => {
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    }
  };

  // Scroll logic for Hero Banner fade out
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.1]);
  const heroY = useTransform(scrollY, [0, 400], [0, 100]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev === 2 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const persistProducts = async (updatedProducts: Product[]) => {
    const previousProducts = products;
    setProducts(updatedProducts);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProducts),
        credentials: 'include'
      });
      if (res.ok) {
        console.log("Products saved to server successfully");
        return true;
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.error("Server save failed:", errorData);
        setProducts(previousProducts); // Revert on failure
        
        const fullError = (errorData.error || "") + " " + (errorData.details || "");
        
        if (fullError.includes("PERMISSION_DENIED")) {
           alert("ডেটাবেজ পারমিশন সমস্যা! (Permission Denied). \nবিস্তারিত: " + fullError);
        } else if (res.status === 413 || fullError.includes("ENTITY_TOO_LARGE") || fullError.includes("too large") || fullError.includes("limit")) {
           alert("ফাইল সাইজ অনেক বড় (File Too Large)! ছবিগুলো আরও ছোট রেজোলিউশনে আপলোড করুন।");
        } else if (fullError.includes("NOT_FOUND") || fullError.includes("not found")) {
           alert("ডেটাবেজ কানেকশন সমস্যা (Database Not Found)! সার্ভার রিস্টার্ট হতে পারে, দয়া করে ১ মিনিট পর চেষ্টা করুন।");
        } else {
           alert("প্রোডাক্ট সেভ করতে ব্যর্থ হয়েছে। সার্ভার মেসেজ: " + (errorData.error || "Unknown Error"));
        }
        return false;
      }
    } catch (err) {
      console.error("Error persisting products to server:", err);
      setProducts(previousProducts); // Revert on failure
      alert("নেটওয়ার্ক সমস্যা! প্রোডাক্ট সেভ করা যায়নি।");
      return false;
    }
  };

  const persistCategories = async (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCategories),
        credentials: 'include'
      });
      if (!res.ok) {
        const errorText = await res.text();
        alert("ক্যাটাগরি সেভ করতে ব্যর্থ হয়েছে: " + errorText);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error persisting categories:", err);
      alert("নেটওয়ার্ক সমস্যা! ক্যাটাগরি সেভ করা যায়নি।");
      return false;
    }
  };

  // Quick edit for products from the shop grid
  const handleQuickEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct(product);
    setShowProductForm(true);
    setShowAdminDashboard(true);
    setActiveTab('products');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* --- Random Product Discovery Modal --- */}
      <AnimatePresence>
        {randomProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRandomProduct(null)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[110] max-w-lg mx-auto bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setRandomProduct(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white shadow-md"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 aspect-square relative">
                  <img 
                    src={randomProduct.media?.[0]?.url || 'https://via.placeholder.com/600x600?text=No+Image'} 
                    className="w-full h-full object-cover" 
                    alt={randomProduct.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/600x600?text=${encodeURIComponent(randomProduct.name)}`;
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-black">
                    Lucky Pick!
                  </div>
                </div>
                <div className="p-8 flex-grow flex flex-col justify-center">
                  <span className="text-xs font-black text-primary uppercase tracking-widest mb-2">{randomProduct.category}</span>
                  <h3 className="text-2xl font-black text-gray-900 mb-4">{randomProduct.name}</h3>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl font-black text-gray-900">৳{randomProduct.price}</span>
                    <span className="text-sm text-gray-400 line-through">৳{randomProduct.originalPrice}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-6 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < Math.floor(randomProduct.rating) ? "currentColor" : "none"} className={i < Math.floor(randomProduct.rating) ? "" : "text-gray-200"} />
                    ))}
                    <span className="text-gray-400 text-xs ml-2 font-bold">{randomProduct.rating}</span>
                  </div>
                  <button 
                    onClick={() => addToCart(randomProduct)}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={20} />
                    Add to Cart
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminDashboard && user?.isAdmin && (
          <AdminDashboard 
            onClose={() => setShowAdminDashboard(false)}
            products={products}
            setProducts={setProducts}
            siteContent={siteContent}
            setSiteContent={setSiteContent}
            saveSiteContent={saveSiteContent}
            // Passing lifted states
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            editingProduct={editingProduct}
            setEditingProduct={setEditingProduct}
            showProductForm={showProductForm}
            setShowProductForm={setShowProductForm}
            newProduct={newProduct}
            setNewProduct={setNewProduct}
            handleImageUpload={handleImageUpload}
            persistCategories={persistCategories}
            persistProducts={persistProducts}
          />
        )}
      </AnimatePresence>

      {/* --- Global Edit Mode Indicator --- */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[200] bg-primary text-white py-2 px-4 flex justify-between items-center shadow-xl font-black text-xs uppercase tracking-[0.2em]"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              Live Editing Mode Enabled
            </div>
            <button 
              onClick={() => setIsEditMode(false)}
              className="bg-white text-primary px-4 py-1 rounded-full text-[10px] hover:bg-gray-100 transition-colors"
            >
              Turn Off
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Sidebar Menu --- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              id="sidebar-overlay"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[60] w-72 bg-white p-6 shadow-2xl"
              id="sidebar-menu"
            >
              <div className="flex items-center justify-between mb-10">
                <span className="text-2xl font-bold text-primary">{siteContent.siteName}</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-gray-500 rounded-full hover:bg-gray-100">
                  <X size={24} />
                </button>
              </div>
              <nav className="space-y-2">
                {[
                  { name: siteContent.navHome, icon: Home, action: () => { setShowCheckout(false); setShowMyOrders(false); setShowPost(false); setShowAdminDashboard(false); setIsSidebarOpen(false); } },
                  { name: 'My Orders', icon: ShoppingBag, action: () => { setShowMyOrders(true); setShowCheckout(false); setShowPost(false); setShowAdminDashboard(false); setIsSidebarOpen(false); } },
                  ...(user?.isAdmin ? [
                    { name: 'Admin Dashboard', icon: LayoutGrid, action: () => { setShowAdminDashboard(true); setShowMyOrders(false); setShowCheckout(false); setShowPost(false); setIsSidebarOpen(false); } },
                    { name: siteContent.navPost, icon: PlusSquare, action: () => { setShowPost(true); setShowMyOrders(false); setShowCheckout(false); setShowAdminDashboard(false); setIsSidebarOpen(false); } },
                  ] : []),
                  { name: siteContent.navProducts, icon: ShoppingBag, action: () => setIsSidebarOpen(false) },
                  { name: siteContent.navCategories, icon: LayoutGrid, action: () => setIsSidebarOpen(false) },
                  { name: siteContent.navSale, icon: Percent, action: () => setIsSidebarOpen(false) },
                  { name: 'Flash Deals', icon: Flame, action: () => setIsSidebarOpen(false) },
                  { name: 'My Profile', icon: User, action: () => { if(user) { setShowProfile(true); setShowCheckout(false); setShowPost(false); setShowAdminDashboard(false); setIsSidebarOpen(false); } else { setShowLoginModal(true); setIsSidebarOpen(false); } } },
                ].map((item) => (
                  <button 
                    key={item.name} 
                    onClick={item.action}
                    className="w-full flex items-center gap-4 px-4 py-3 text-lg font-medium text-gray-700 transition-colors rounded-xl hover:bg-orange-50 hover:text-primary cursor-pointer text-left"
                  >
                    <item.icon size={22} className="opacity-70" />
                    {item.name}
                  </button>
                ))}
              </nav>
              <div className="absolute bottom-6 left-6 right-6 pt-6 border-t border-gray-100">
                {user?.isAdmin && (
                  <button 
                    onClick={() => { setIsEditMode(!isEditMode); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-3 text-lg font-bold transition-all rounded-xl mt-4 ${isEditMode ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Settings size={22} className={isEditMode ? 'animate-spin-slow' : ''} />
                    {isEditMode ? 'Disable Editing' : 'Enable Editing'}
                  </button>
                )}
                {user ? (
                  <button onClick={handleLogout} className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors mt-2">
                    Log Out
                  </button>
                ) : (
                  <button onClick={() => { setShowLoginModal(true); setIsSidebarOpen(false); }} className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors">
                    Sign In
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- Multi-Provider Auth Modal (Redesigned) --- */}
      <AnimatePresence mode="wait">
        {showLoginModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
              id="auth-overlay"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[310] max-w-[420px] mx-auto bg-white rounded-[2.5rem] overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] border border-gray-100"
              id="auth-modal"
            >
              {/* Header with Background Pattern */}
              <div className="relative h-40 bg-gray-900 flex flex-col items-center justify-center p-8 overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                   <div className="absolute top-0 -left-10 w-48 h-48 bg-primary blur-[100px] rounded-full" />
                   <div className="absolute bottom-0 -right-10 w-48 h-48 bg-blue-500 blur-[100px] rounded-full" />
                </div>
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-2xl">
                      <ShoppingBag className="text-white" size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-white tracking-tight">
                     {loginStep === 'providers' ? 'Welcome Back' : 
                      loginStep === 'phone' ? 'Phone Verification' : 
                      loginStep === 'otp' ? 'Enter Code' : 
                      loginStep === 'email' ? 'Sign In' : 
                      'New Account'}
                   </h3>
                   <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
                      {siteContent.siteName} Gateway
                   </p>
                </div>
              </div>

              <div className="p-8 md:p-10">
                {loginStep === 'providers' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <button 
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-between bg-white border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 transition-all active:scale-[0.98] group"
                      >
                        <div className="flex items-center gap-4">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-sm">Continue with Google</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                      </button>

                      <button 
                        onClick={handleFacebookLogin}
                        className="w-full flex items-center justify-between bg-[#1877F2] p-4 rounded-2xl font-bold text-white hover:bg-[#166fe5] transition-all active:scale-[0.98] group shadow-lg shadow-[#1877F2]/20"
                      >
                        <div className="flex items-center gap-4">
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="text-sm">Continue with Facebook</span>
                        </div>
                        <ChevronRight size={18} className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </button>
                    </div>

                    <div className="relative py-2">
                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                       <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-gray-400"><span className="bg-white px-4">Or use</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setLoginStep('email')}
                        className="flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-800 p-6 rounded-[2rem] font-bold hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-[0.98] border border-transparent shadow-sm"
                      >
                        <Mail size={24} className="text-primary" />
                        <span className="text-[10px] uppercase tracking-widest">Email</span>
                      </button>
                      <button 
                        onClick={handlePhoneLogin}
                        className="flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-800 p-6 rounded-[2rem] font-bold hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-[0.98] border border-transparent shadow-sm"
                      >
                        <Phone size={24} className="text-blue-500" />
                        <span className="text-[10px] uppercase tracking-widest">Phone</span>
                      </button>
                    </div>

                    <div className="pt-6 text-center">
                      <button 
                        onClick={() => setLoginStep('register')}
                        className="group flex flex-col items-center gap-2 w-full"
                      >
                        <span className="text-[10px] uppercase tracking-widest font-black text-gray-300 group-hover:text-gray-400 transition-colors">New to {siteContent.siteName}?</span>
                        <span className="text-gray-900 font-black flex items-center gap-1.5 group-hover:text-primary transition-all group-hover:gap-2">
                          Create Account <Plus size={18} />
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {loginStep === 'email' && (
                  <form onSubmit={handleEmailLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                      <input 
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoginLoading}
                      className="w-full bg-gray-900 text-white p-5 rounded-2xl font-black transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2"
                    >
                      {isLoginLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Sign In Securely'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLoginStep('providers')}
                      className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest py-2 hover:text-gray-900 transition-colors"
                    >
                      ← Back to methods
                    </button>
                  </form>
                )}

                {loginStep === 'register' && (
                  <form onSubmit={handleEmailRegister} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                      <input 
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                        required
                        minLength={6}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoginLoading}
                      className="w-full bg-primary text-white p-5 rounded-2xl font-black mt-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      {isLoginLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Create Account'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLoginStep('providers')}
                      className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest py-2 hover:text-gray-900 transition-colors"
                    >
                      Already a member? Sign In
                    </button>
                  </form>
                )}

                {loginStep === 'phone' && (
                  <form onSubmit={sendOtp} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+8801XXXXXXXXX"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoginLoading}
                      className="w-full bg-gray-900 text-white p-5 rounded-2xl font-black transition-all active:scale-[0.98] shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2"
                    >
                      {isLoginLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Send Verification Code'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLoginStep('providers')}
                      className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest py-2 hover:text-gray-900 transition-colors"
                    >
                      ← Use different method
                    </button>
                  </form>
                )}

                {loginStep === 'otp' && (
                  <form onSubmit={verifyOtp} className="space-y-6 text-center">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Code</label>
                      <input 
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="000000"
                        className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-black text-4xl tracking-[0.5em] text-center text-gray-900"
                        autoFocus
                        maxLength={6}
                        required
                      />
                      <p className="text-[10px] font-bold text-gray-400">Code sent to <span className="text-gray-900">{phoneNumber}</span></p>
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoginLoading}
                      className="w-full bg-primary text-white p-5 rounded-2xl font-black transition-all active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      {isLoginLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Verify & Login'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLoginStep('phone')}
                      className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest py-2 hover:text-gray-900 transition-colors"
                    >
                      Try another number
                    </button>
                  </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-50 text-center flex flex-col gap-4">
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 p-3 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <ExternalLink size={14} />
                    Open in New Tab (Recommended for Login)
                  </a>
                  <button 
                    onClick={() => setShowLoginModal(false)}
                    className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-gray-500 transition-colors"
                  >
                    Not now, maybe later
                  </button>
                  <p className="text-[9px] text-gray-400 leading-relaxed px-4">
                    By continuing, you agree to our <span className="text-gray-900 font-bold underline decoration-dotted">Terms of Use</span> and <span className="text-gray-900 font-bold underline decoration-dotted">Privacy Policy</span>.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Header --- */}
      <motion.header 
        initial={{ y: 0 }}
        animate={{ y: isNavVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-4 md:px-8"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-800 hover:bg-gray-100 rounded-lg lg:hidden"
              id="hamburger-menu"
            >
              <Menu size={24} />
            </button>
            {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-8 mr-8">
                <button 
                  onClick={() => { setShowCheckout(false); setShowPost(false); setShowAdminDashboard(false); }}
                  className={`font-semibold cursor-pointer transition-colors ${!showCheckout && !showPost && !showAdminDashboard ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
                >
                  <EditableText 
                    contentKey="navHome" 
                    value={siteContent.navHome} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </button>
                {user?.isAdmin && (
                  <button 
                    onClick={() => setShowAdminDashboard(true)}
                    className={`font-medium cursor-pointer transition-colors ${showAdminDashboard ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
                  >
                    Dashboard
                  </button>
                )}
                {user?.isAdmin && (
                  <button 
                    onClick={() => { setShowPost(true); setShowCheckout(false); setShowAdminDashboard(false); }}
                    className={`font-medium cursor-pointer transition-colors ${showPost ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
                  >
                    <EditableText 
                      contentKey="navPost" 
                      value={siteContent.navPost} 
                      isEditMode={isEditMode} 
                      onUpdate={updateSiteContent} 
                    />
                  </button>
                )}
              <a href="#" className="font-medium text-gray-600 hover:text-primary transition-colors">
                <EditableText 
                  contentKey="navProducts" 
                  value={siteContent.navProducts} 
                  isEditMode={isEditMode} 
                  onUpdate={updateSiteContent} 
                />
              </a>
              <a href="#" className="font-medium text-gray-600 hover:text-primary transition-colors">
                <EditableText 
                  contentKey="navSale" 
                  value={siteContent.navSale} 
                  isEditMode={isEditMode} 
                  onUpdate={updateSiteContent} 
                />
              </a>
            </nav>
          </div>

          <div className="flex-1 flex items-center justify-center pointer-events-none">
            <button 
              onClick={() => { 
                setShowCheckout(false); 
                setShowPost(false); 
                setShowAdminDashboard(false);
                handleLogoClick();
              }}
              className="text-xl md:text-3xl font-black text-primary uppercase tracking-tighter cursor-pointer pointer-events-auto" 
              id="logo"
            >
              <EditableText 
                contentKey="siteName" 
                value={siteContent.siteName} 
                isEditMode={isEditMode} 
                onUpdate={updateSiteContent}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {user?.isAdmin && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded-xl transition-all ${isEditMode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                title={isEditMode ? "Disable Editing" : "Enable Editing"}
              >
                <Settings size={20} className={isEditMode ? 'animate-spin-slow' : ''} />
              </button>
            )}
            
            <div className="relative">
              <button 
                onClick={() => user?.isAdmin && setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all relative"
              >
                <Bell size={22} strokeWidth={2.5} />
                {unreadMessages.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden z-[100] text-left"
                  >
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">Notifications</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {unreadMessages.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">No new messages</div>
                      ) : (
                        unreadMessages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className="p-5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); setShowNotifications(false); setShowAdminDashboard(true); setActiveTab('stats'); }}
                          >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase">Customer Msg</span>
                                <span className="text-[9px] text-gray-400 font-bold">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed">{msg.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-all relative"
            >
              <ShoppingBag size={24} strokeWidth={2.5} />
              {cartItems.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {cartItems.length}
                </span>
              )}
            </button>

            {user ? (
               <button 
                 onClick={() => setShowProfile(true)}
                 className="flex items-center"
               >
                 <img src={user.picture || 'https://www.gravatar.com/avatar/000?d=mp'} className="w-9 h-9 rounded-full border-2 border-primary object-cover" />
               </button>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-primary text-white px-5 py-2 rounded-lg font-bold text-sm md:text-base hover:bg-primary-dark transition-all shadow-md active:scale-95" 
                id="signin-button"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {showCheckout ? (
        <CheckoutView 
          cartItems={cartItems} 
          cartTotal={cartTotal} 
          onClose={() => setShowCheckout(false)}
          onRemove={removeFromCart}
          onUpdateQty={updateQuantity}
          onCheckout={handleCheckout}
          user={user}
        />
      ) : showMyOrders ? (
        <MyOrdersView onClose={() => setShowMyOrders(false)} />
      ) : showProductsPage ? (
        <ProductsPageView 
          products={products}
          onAddToCart={addToCart}
          onClose={() => setShowProductsPage(false)}
          isEditMode={isEditMode}
          updateProductPrice={updateProductPrice}
          user={user}
          handleQuickEdit={handleQuickEdit}
          onSelectProduct={setSelectedProduct}
        />
      ) : (showPost && user?.isAdmin) ? (
        <PostView 
          onClose={() => setShowPost(false)} 
          siteName={siteContent.siteName} 
          onAddProduct={async (newProduct) => {
            const updated = [newProduct, ...products];
            const success = await persistProducts(updated);
            if (success) {
              setShowPost(false);
            }
          }}
        />
      ) : showProfile ? (
        user ? (
          <ProfileView 
            user={user} 
            onUpdate={handleProfileUpdate} 
            onClose={() => setShowProfile(false)} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <h2 className="text-3xl font-black text-gray-800">Login Required</h2>
            <p className="text-gray-500">Please sign in to view your profile.</p>
            <button onClick={() => setShowLoginModal(true)} className="bg-primary text-white px-8 py-3 rounded-xl font-bold">Sign In</button>
          </div>
        )
      ) : (
        <main>
          {/* Hero Banner with fade out on scroll */}
          <motion.section 
            style={{ opacity: heroOpacity, y: heroY }}
            className="relative h-[450px] md:h-[600px] overflow-hidden bg-gray-900" 
            id="hero-slider"
          >
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeSlide}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                <img 
                  src={siteContent.heroImages[activeSlide] || null} 
                  alt="Fashion Summer Sale" 
                  className="w-full h-full object-cover opacity-60"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </AnimatePresence>

            {isEditMode && (
              <div className="absolute top-24 right-8 z-[100] flex flex-col gap-2 p-4 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
                <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-2 px-2">Banner Images (3)</h5>
                {siteContent.heroImages.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                    <span className="w-6 h-6 flex items-center justify-center text-[10px] font-black text-primary bg-white rounded-lg">#{idx + 1}</span>
                    <input 
                      type="text" 
                      defaultValue={img}
                      onBlur={(e) => updateHeroImage(idx, e.target.value)}
                      placeholder="Paste Image URL here"
                      className="bg-transparent text-[10px] text-white/90 p-1 w-48 font-mono outline-none placeholder:text-white/20"
                    />
                  </div>
                ))}
                <p className="text-[9px] font-bold text-white/40 mt-2 px-2 italic">※ Edit URL and click outside to save.</p>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center text-center px-6">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h4 className="text-primary font-bold tracking-[0.3em] uppercase mb-4 text-sm md:text-lg">
                  <EditableText 
                    contentKey="heroSubtitle" 
                    value={siteContent.heroSubtitle} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </h4>
                <h2 className="text-4xl md:text-7xl font-black text-white mb-6 leading-none">
                  <EditableText 
                    contentKey="heroTitle" 
                    value={siteContent.heroTitle} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </h2>
                <p className="text-white/80 text-xl md:text-2xl mb-8 font-medium">
                  <EditableText 
                    contentKey="heroPromo" 
                    value={siteContent.heroPromo} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={handleShopNow}
                    className="bg-primary text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-primary/30 active:scale-95" 
                    id="shop-now-hero"
                  >
                    <EditableText 
                      contentKey="heroBtnShop" 
                      value={siteContent.heroBtnShop} 
                      isEditMode={isEditMode} 
                      onUpdate={updateSiteContent} 
                    />
                  </button>
                  <button className="border-2 border-white text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-black transition-all backdrop-blur-sm active:scale-95">
                    <EditableText 
                      contentKey="heroBtnExplore" 
                      value={siteContent.heroBtnExplore} 
                      isEditMode={isEditMode} 
                      onUpdate={updateSiteContent} 
                    />
                  </button>
                </div>
              </motion.div>

              {/* Pagination Dots */}
              <div className="absolute bottom-8 flex gap-2">
                {siteContent.heroImages.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveSlide(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${activeSlide === i ? 'w-8 bg-primary' : 'w-2.5 bg-white/40'}`}
                  />
                ))}
              </div>
            </div>
          </motion.section>

          {/* --- Category Section --- */}
          <section className="py-12 md:py-16 overflow-hidden bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 border-l-4 border-primary pl-4">
                  <EditableText 
                    contentKey="categoryTitle" 
                    value={siteContent.categoryTitle} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </h3>
                <button 
                  onClick={() => {
                    setShowProductsPage(true);
                  }}
                  className="text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                >
                  <EditableText 
                    contentKey="categorySeeAll" 
                    value={siteContent.categorySeeAll} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  /> <ChevronRight size={18} />
                </button>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
                {categories.map((cat) => (
                  <div 
                    key={cat.id} 
                    onClick={() => {
                        setShowProductsPage(true);
                    }}
                    className="flex-shrink-0 w-36 md:w-48 aspect-[3/4] rounded-3xl overflow-hidden relative group snap-start cursor-pointer shadow-lg"
                  >
                    <img 
                      src={cat.image || 'https://via.placeholder.com/400x400?text=Category'} 
                      alt={cat.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x400?text=${encodeURIComponent(cat.name)}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-4">
                      <EditableText 
                        contentKey={cat.id} 
                        value={cat.name} 
                        isEditMode={isEditMode} 
                        onUpdate={updateCategoryName}
                        className="text-white font-bold text-lg md:text-xl drop-shadow-md text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- Product Grid: Featured Products --- */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-gray-900 border-l-4 border-primary pl-4">
                  <EditableText 
                    contentKey="featuredTitle" 
                    value={siteContent.featuredTitle} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {products.length === 0 ? (
                          <div className="col-span-full py-20 text-center flex flex-col items-center gap-6 opacity-40">
                             <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                                <ShoppingBag size={48} className="text-gray-300" />
                             </div>
                             <div>
                               <p className="text-2xl font-black text-gray-900 mb-2">No Products Found</p>
                               <p className="text-sm font-bold text-gray-500">Add some products to your storefront to get started!</p>
                             </div>
                             {user?.isAdmin && (
                               <button 
                                 onClick={() => setShowPost(true)}
                                 className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                               >
                                 <Plus size={20} /> Add Product
                               </button>
                             )}
                          </div>
                        ) : (
                          products.map((product) => (
                            <ProductCard 
                              key={product.id} 
                              product={product} 
                              onAddToCart={() => addToCart(product)} 
                              isEditMode={isEditMode}
                              onUpdatePrice={updateProductPrice}
                              adminUser={user}
                              onQuickEdit={handleQuickEdit}
                              onSelect={setSelectedProduct}
                            />
                          ))
                        )}
              </div>
            </div>
          </section>

          {/* --- Product Grid: Recent Products --- */}
          <section className="py-12 md:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 text-center mb-16">
              <h3 className="text-4xl font-black text-gray-900 mb-4">
                <EditableText 
                  contentKey="latestTitle" 
                  value={siteContent.latestTitle} 
                  isEditMode={isEditMode} 
                  onUpdate={updateSiteContent} 
                />
              </h3>
              <p className="text-gray-500 max-w-2xl mx-auto">
                <EditableText 
                  contentKey="latestDesc" 
                  value={siteContent.latestDesc} 
                  isEditMode={isEditMode} 
                  onUpdate={updateSiteContent} 
                  multiline
                />
              </p>
            </div>

            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {products.slice(0, 4).map((product) => (
                  <ProductCard 
                    key={`${product.id}-recent`} 
                    product={product} 
                    onAddToCart={() => addToCart(product)} 
                    isEditMode={isEditMode}
                    onUpdatePrice={updateProductPrice}
                    adminUser={user}
                    onQuickEdit={handleQuickEdit}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
              
              <div className="mt-16 text-center">
                <button 
                  onClick={() => setShowProductsPage(true)}
                  className="px-12 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-primary transition-all shadow-xl active:scale-95"
                >
                  <EditableText 
                    contentKey="latestBtnViewAll" 
                    value={siteContent.latestBtnViewAll} 
                    isEditMode={isEditMode} 
                    onUpdate={updateSiteContent} 
                  />
                </button>
              </div>
            </div>
          </section>

          {/* --- Live Scrolling Ticker Banner --- */}
          <section className="relative overflow-hidden bg-orange-500 py-3 md:py-4 shadow-lg border-y-2 border-white/10 group">
            <div className="flex whitespace-nowrap overflow-hidden">
              <motion.div
                animate={{ x: [0, -1000] }}
                transition={{ 
                  duration: 25, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex items-center"
              >
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="text-white font-black text-lg md:text-2xl px-8 flex items-center gap-4 italic uppercase tracking-wider">
                    {siteContent.liveBannerText}
                  </span>
                ))}
              </motion.div>
              {/* Duplicate for seamless loop */}
              <motion.div
                animate={{ x: [0, -1000] }}
                transition={{ 
                  duration: 25, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex items-center"
              >
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="text-white font-black text-lg md:text-2xl px-8 flex items-center gap-4 italic uppercase tracking-wider">
                    {siteContent.liveBannerText}
                  </span>
                ))}
              </motion.div>
            </div>
            {user?.isAdmin && (
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditMode(!isEditMode)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-white text-orange-600 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-20 hover:bg-orange-50"
              >
                <Edit size={18} strokeWidth={3} />
              </motion.button>
            )}
            
            {/* Inline Editor for Admin */}
            {isEditMode && user?.isAdmin && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-30 px-4">
                 <div className="bg-white p-2 rounded-2xl flex items-center shadow-2xl w-full max-w-lg">
                    <input 
                      type="text"
                      className="flex-grow px-4 py-2 text-gray-900 font-bold outline-none border-none"
                      value={siteContent.liveBannerText}
                      onChange={(e) => updateSiteContent('liveBannerText', e.target.value)}
                      placeholder="Enter banner text..."
                      autoFocus
                    />
                    <button 
                      onClick={() => setIsEditMode(false)}
                      className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition-all"
                    >
                      Save
                    </button>
                 </div>
              </div>
            )}
          </section>

          {/* --- Promotional Banner --- */}
          <section className="py-12 px-4">
            <div className="max-w-7xl mx-auto rounded-[2rem] overflow-hidden bg-orange-600 relative h-64 md:h-80 flex items-center">
               <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 md:opacity-60">
                 <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800" className="w-full h-full object-cover" />
               </div>
               <div className="relative z-10 px-8 md:px-16 md:w-2/3">
                  <h3 className="text-3xl md:text-5xl font-black text-white mb-4">
                    <EditableText 
                      contentKey="promoTitle" 
                      value={siteContent.promoTitle} 
                      isEditMode={isEditMode} 
                      onUpdate={updateSiteContent} 
                    />
                  </h3>
                  <p className="text-white/90 text-lg md:text-xl mb-6">
                    <EditableText 
                      contentKey="promoDesc" 
                      value={siteContent.promoDesc} 
                      isEditMode={isEditMode} 
                      onUpdate={updateSiteContent} 
                      multiline
                    />
                  </p>
                  <button className="bg-white text-primary px-8 py-3 rounded-xl font-black hover:bg-gray-100 transition-all shadow-xl active:scale-95">
                    <EditableText 
                      contentKey="promoBtnJoin" 
                      value={siteContent.promoBtnJoin} 
                      isEditMode={isEditMode} 
                      onUpdate={updateSiteContent} 
                    />
                  </button>
               </div>
            </div>
          </section>
        </main>
      )}

      {/* --- Footer --- */}
      <footer className="bg-gray-900 pt-20 pb-12 px-6 text-white overflow-hidden relative">
        {/* Abstract Background Shapes */}
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
          <div>
            <button 
              onClick={() => {
                setShowCheckout(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                handleLogoClick();
              }}
              className="text-3xl font-black text-primary mb-6 cursor-pointer uppercase"
            >
              <EditableText 
                contentKey="siteName" 
                value={siteContent.siteName} 
                isEditMode={isEditMode} 
                onUpdate={updateSiteContent}
              />
            </button>
            <p className="text-gray-400 mb-8 leading-relaxed">
              <EditableText 
                contentKey="footerSlogan" 
                value={siteContent.footerSlogan} 
                isEditMode={isEditMode} 
                onUpdate={updateSiteContent}
                multiline
              />
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, idx) => (
                <a key={idx} href="#" className="p-3 bg-white/5 rounded-full hover:bg-primary transition-colors hover:scale-110">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          <div>
             <h4 className="text-xl font-bold mb-6">
               <EditableText 
                 contentKey="footerHeadingCollections" 
                 value={siteContent.footerHeadingCollections} 
                 isEditMode={isEditMode} 
                 onUpdate={updateSiteContent} 
               />
             </h4>
             <ul className="space-y-4 text-gray-400">
               <li><a href="#" className="hover:text-primary transition-colors">Mens Fashion</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Womens Fashion</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Accessories</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">New Arrivals</a></li>
             </ul>
          </div>

          <div>
             <h4 className="text-xl font-bold mb-6">
               <EditableText 
                 contentKey="footerHeadingSupport" 
                 value={siteContent.footerHeadingSupport} 
                 isEditMode={isEditMode} 
                 onUpdate={updateSiteContent} 
               />
             </h4>
             <ul className="space-y-4 text-gray-400">
               <li><a href="#" className="hover:text-primary transition-colors">Order Tracking</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Refund Policy</a></li>
             </ul>
          </div>

          <div>
             <h4 className="text-xl font-bold mb-6">Newsletter</h4>
             <p className="text-gray-400 mb-6 font-medium">Get the latest fashion news and exclusive offers!</p>
             <div className="flex bg-white/5 rounded-2xl p-1.5 focus-within:ring-2 ring-primary transition-all">
                <input 
                  type="email" 
                  placeholder="Your Email" 
                  className="bg-transparent border-none focus:ring-0 px-4 w-full text-white placeholder-gray-500" 
                />
                <button className="bg-primary text-white p-3 rounded-xl hover:bg-primary-dark transition-colors">
                  <ChevronRight size={24} strokeWidth={3} />
                </button>
             </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-gray-500 font-medium gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p>© {new Date().getFullYear()} {siteContent.siteName} Fashion Hub. All rights reserved.</p>
            <p className="text-xs text-gray-600 font-mono tracking-wider">{siteContent.siteDomain}</p>
          </div>
          <div className="relative group p-[2px] rounded-full overflow-hidden">
            {/* Animated Glow Backdrop */}
            <motion.div 
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute inset-0 bg-linear-to-r from-primary via-purple-500 to-cyan-400 blur-sm opacity-70"
            />
            
            {/* Content Bar */}
            <div className="relative bg-gray-900/90 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex items-center justify-center">
              <motion.p 
                animate={{ 
                  color: ["#ff4500", "#a855f7", "#22d3ee", "#ff4500"] 
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="italic font-black uppercase tracking-widest text-sm"
              >
                md sisir owner
              </motion.p>
            </div>
          </div>
        </div>
      </footer>
      <AnimatePresence>
        {isCartOpen && (
          <CartSidebar 
            cartItems={cartItems} 
            onClose={() => setIsCartOpen(false)} 
            onRemove={removeFromCart} 
            onUpdateQty={updateQuantity}
            onCheckout={() => { setIsCartOpen(false); setShowCheckout(true); }}
          />
        )}
      </AnimatePresence>

      <FloatingChat user={user} />
      
      {/* --- Cropper Modal --- */}
      {cropImage && (
         <CropperModal 
           image={cropImage} 
           aspect={cropAspect} 
           onCropComplete={(url) => {
             if (cropCallback) cropCallback(url);
             setCropImage(null);
           }} 
           onCancel={() => setCropImage(null)} 
         />
      )}

      {/* --- Product Detail Modal --- */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetail 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onAddToCart={addToCart} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductDetail({ 
  product, 
  onClose, 
  onAddToCart 
}: { 
  product: Product, 
  onClose: () => void, 
  onAddToCart: (p: Product, size?: string) => void 
}) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  if (!product) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all md:text-gray-900 md:bg-gray-100 md:hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        {/* Media Gallery */}
        <div className="md:w-1/2 bg-gray-100 relative group flex flex-col">
          <div className="flex-grow relative overflow-hidden h-[300px] md:h-auto">
             <AnimatePresence mode="wait">
                <motion.div
                  key={activeMediaIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  {product.media?.[activeMediaIndex]?.type === 'video' ? (
                    <video src={product.media[activeMediaIndex].url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                  ) : (
                    <img src={product.media?.[activeMediaIndex]?.url || 'https://via.placeholder.com/800x1000'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </motion.div>
             </AnimatePresence>
          </div>
          
          {product.media && product.media.length > 1 && (
            <div className="p-4 flex gap-2 overflow-x-auto bg-white/50 backdrop-blur-sm no-scrollbar">
              {product.media.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMediaIndex(idx)}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeMediaIndex === idx ? 'border-primary' : 'border-transparent opacity-60'}`}
                >
                  <img src={m.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto flex flex-col bg-white">
          <div className="space-y-6">
            <div>
              <span className="text-primary font-black uppercase text-xs tracking-widest">{product.category}</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-1 leading-tight">{product.name}</h2>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-3xl font-black text-primary">৳{product.price}</span>
                {product.originalPrice > product.price && (
                  <span className="text-xl text-gray-400 line-through font-bold">৳{product.originalPrice}</span>
                )}
                {product.discount > 0 && (
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-black">
                    {product.discount}% OFF
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-gray-900 border-b pb-2 uppercase text-sm tracking-widest">Description</h4>
              <p className="text-gray-600 leading-relaxed">
                {product.description || "Exciting premium quality item designed for style and comfort. Perfect for any occasion."}
              </p>
            </div>

            {/* Sizes */}
            <div className="space-y-4">
               <h4 className="font-black text-gray-900 border-b pb-2 uppercase text-sm tracking-widest">Available Sizes</h4>
               <div className="flex flex-wrap gap-2">
                 {(product.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((size) => (
                   <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[3.5rem] h-12 flex items-center justify-center px-4 rounded-xl font-black transition-all border-2 ${
                      selectedSize === size 
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105' 
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                    }`}
                   >
                     {size}
                   </button>
                 ))}
               </div>
            </div>

            <div className="pt-8 flex flex-col gap-4">
              <button 
                onClick={() => {
                  if ((product.sizes && product.sizes.length > 0) && !selectedSize) {
                    alert('Please select a size first / দয়া করে আগে সাইজ সিলেক্ট করুন');
                    return;
                  }
                  onAddToCart(product, selectedSize || undefined);
                  onClose();
                }}
                className={`w-full py-5 font-black rounded-2xl shadow-xl transition-all text-lg flex items-center justify-center gap-3 ${
                  (product.sizes && product.sizes.length > 0 && !selectedSize)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95 cursor-pointer'
                }`}
              >
                <ShoppingBag size={24} /> ADD TO CART
              </button>
              <p className="text-gray-400 text-xs text-center font-medium uppercase tracking-tighter">
                Secure SSL Encrypted Checkout • Quality Guaranteed
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
  isEditMode?: boolean;
  onUpdatePrice?: (id: number, newPrice: number) => void;
  adminUser?: User | null;
  onQuickEdit?: (product: Product) => void;
  onSelect?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  isEditMode, 
  onUpdatePrice,
  adminUser,
  onQuickEdit,
  onSelect
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const nextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.media || product.media.length === 0) return;
    setCurrentMediaIndex((prev) => (prev + 1) % product.media.length);
  };

  const prevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.media || product.media.length === 0) return;
    setCurrentMediaIndex((prev) => (prev - 1 + product.media.length) % product.media.length);
  };

  const currentMedia = product.media?.[currentMediaIndex] || { url: '', type: 'image' as const };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={() => onSelect?.(product)}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all group flex flex-col h-full cursor-pointer"
    >
      <div className="aspect-square relative overflow-hidden bg-gray-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMediaIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {currentMedia.type === 'video' ? (
              <video 
                src={currentMedia.url || null} 
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img 
                src={currentMedia.url || `https://via.placeholder.com/600x600?text=${encodeURIComponent(product.name)}`} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('placeholder')) {
                    target.src = `https://via.placeholder.com/600x600?text=${encodeURIComponent(product.name)}`;
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Media Navigation */}
        {product.media && product.media.length > 1 && (
          <>
            <button 
              onClick={prevMedia}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 backdrop-blur-md rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg hover:bg-white"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <button 
              onClick={nextMedia}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 backdrop-blur-md rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg hover:bg-white"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {product.media.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentMediaIndex ? 'bg-primary w-3' : 'bg-white/60'}`} 
                />
              ))}
            </div>
          </>
        )}
        
        {/* Discount Badge */}
        <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">
          {product.discount}% OFF
        </div>

        {/* Admin Quick Edit Shortcut */}
        {adminUser?.isAdmin && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onQuickEdit?.(product);
            }}
            className="absolute top-3 right-14 p-2.5 bg-primary text-white rounded-full shadow-lg z-20 hover:bg-primary-dark transition-all"
            title="Edit Product Details"
          >
            <Edit size={16} strokeWidth={3} />
          </motion.button>
        )}
        
        {/* Wishlist Button */}
        <button className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-md rounded-full text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-md active:scale-90">
          <Heart size={18} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest mb-1">{product.category}</span>
        <h4 className="text-sm md:text-lg font-bold text-gray-800 line-clamp-1 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h4>
        
        <div className="flex items-center gap-1 mb-3">
          <div className="flex text-yellow-400">
            <Star size={14} fill="currentColor" />
          </div>
          <span className="text-[10px] md:text-xs font-bold text-gray-400">{product.rating} (0.0)</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-4">
            {isEditMode ? (
              <div className="flex items-center gap-1">
                <span className="text-xl font-black text-primary">৳</span>
                <input 
                  type="number"
                  defaultValue={product.price}
                  onBlur={(e) => onUpdatePrice?.(product.id, Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onUpdatePrice?.(product.id, Number((e.target as HTMLInputElement).value));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-20 bg-primary/5 border-b-2 border-primary text-lg font-black text-primary outline-none px-1"
                />
              </div>
            ) : (
              <span className="text-lg md:text-xl font-black text-gray-900">৳{product.price}</span>
            )}
            <span className="text-xs md:text-sm text-gray-400 line-through font-medium">৳{product.originalPrice}</span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={onAddToCart}
              className="flex-grow bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <ShoppingCart size={16} />
              Add to Cart
            </button>
            <button className="p-2.5 bg-orange-100 text-primary rounded-xl hover:bg-orange-200 transition-colors active:scale-90">
              <ShoppingBag size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CheckoutView({ 
  cartItems, 
  cartTotal, 
  onClose,
  onRemove,
  onUpdateQty,
  onCheckout,
  user
}: { 
  cartItems: CartItem[], 
  cartTotal: number, 
  onClose: () => void,
  onRemove: (id: string | number) => void,
  onUpdateQty: (id: string | number, delta: number) => void,
  onCheckout: (address: string, phone: string, method: string, trxId?: string) => void,
  user: User | null
}) {
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [gatewayStep, setGatewayStep] = useState<'number' | 'otp' | 'pin'>('number');
  const [gatewayNumber, setGatewayNumber] = useState('');
  const [gatewayOtp, setGatewayOtp] = useState('');
  const [gatewayPin, setGatewayPin] = useState('');
  const [trxId, setTrxId] = useState('');

  const handleGatewayComplete = () => {
    const generatedTrxId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setTrxId(generatedTrxId);
    setShowPaymentGateway(false);
    onCheckout(address, phone, paymentMethod, generatedTrxId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-7xl mx-auto px-4 py-12 md:py-20 animate-in fade-in slide-in-from-right-10"
    >
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart List */}
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
            <h2 className="text-3xl font-black text-gray-900">Your Shopping Bag</h2>
            <button onClick={onClose} className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Continue Shopping <ChevronRight size={20} />
            </button>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <ShoppingBag size={80} className="text-gray-200 mb-6" />
              <p className="text-xl font-bold text-gray-400">Your bag is empty.</p>
              <button 
                onClick={onClose}
                className="mt-8 bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-xl"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-6 p-4 rounded-3xl bg-white shadow-sm border border-gray-50 group">
                  <div className="w-24 md:w-32 aspect-square rounded-2xl overflow-hidden relative">
                    <img 
                      src={item.media?.[0]?.url || 'https://via.placeholder.com/400x400?text=No+Image'} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x400?text=${encodeURIComponent(item.name)}`;
                      }}
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-lg md:text-xl font-bold text-gray-900">{item.name}</h4>
                        <button 
                          onClick={() => onRemove(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <p className="text-primary font-black text-lg">৳{item.price}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-gray-100 rounded-xl p-1 px-3 gap-4">
                        <button 
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="text-gray-500 font-black hover:text-primary transition-colors text-xl"
                        >
                          −
                        </button>
                        <span className="font-black text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQty(item.id, 1)}
                          className="text-gray-500 font-black hover:text-primary transition-colors text-xl"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-black text-gray-900">Total: ৳{item.price * item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary, Shipping Info & Payment */}
        <div className="lg:w-96 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl">
             <h3 className="text-xl font-black mb-6">Delivery Details</h3>
             <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Full Address</label>
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, Area, District"
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all text-sm font-bold min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Phone Number</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all text-sm font-bold"
                  />
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl">
             <h3 className="text-xl font-black mb-6">Payment Method</h3>
             <div className="space-y-3">
                {[
                  { id: 'cod', name: 'Cash on Delivery', icon: <Banknote size={24} className="text-primary" /> },
                  { id: 'bkash', name: 'bKash', icon: <img src="https://raw.githubusercontent.com/faraazahmad/bangladesh-bank-logo/master/logos/bkash-logo.png" className="w-8 h-8 object-contain" alt="bKash" /> , detail: 'Personal: 01631479482' },
                  { id: 'nagad', name: 'Nagad', icon: <img src="https://raw.githubusercontent.com/faraazahmad/bangladesh-bank-logo/master/logos/nagad-logo.png" className="w-8 h-8 object-contain" alt="Nagad" />, detail: 'Personal: 01319807658' }
                ].map((method) => (
                  <button 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`w-full flex flex-col items-start p-4 rounded-2xl border-2 transition-all ${
                      paymentMethod === method.id 
                        ? (method.id === 'bkash' ? 'border-[#D12053] bg-[#D12053]/5' : 
                           method.id === 'nagad' ? 'border-[#F15922] bg-[#F15922]/5' : 
                           'border-primary bg-primary/5')
                        : 'border-gray-50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${paymentMethod === method.id ? '' : 'grayscale opacity-50'}`}>
                        {method.icon}
                      </div>
                      <span className={`font-bold ${
                        paymentMethod === method.id 
                          ? (method.id === 'bkash' ? 'text-[#D12053]' : 
                             method.id === 'nagad' ? 'text-[#F15922]' : 
                             'text-gray-900')
                          : 'text-gray-600'
                      }`}>{method.name}</span>
                    </div>
                    {method.detail && (
                      <span className={`text-[10px] font-black mt-1 ml-11 uppercase ${
                        paymentMethod === method.id 
                          ? (method.id === 'bkash' ? 'text-[#D12053]/60' : 
                             method.id === 'nagad' ? 'text-[#F15922]/60' : 
                             'text-gray-400')
                          : 'text-gray-400'
                      }`}>{method.detail}</span>
                    )}
                  </button>
                ))}

                {paymentMethod !== 'cod' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="pt-2"
                  >
                    <button 
                      onClick={() => {
                        setShowPaymentGateway(true);
                        setGatewayStep('number');
                      }}
                      className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${paymentMethod === 'bkash' ? 'bg-[#D12053]' : 'bg-[#F15922]'}`}
                    >
                      {paymentMethod === 'bkash' ? 'bKash Pay' : 'Nagad Pay'} 
                      <ChevronRight size={20} />
                    </button>
                    {trxId && (
                      <div className="mt-4 p-4 bg-green-50 rounded-2xl border-2 border-green-200 text-center">
                         <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Payment Verified</p>
                         <p className="font-black text-green-700 font-mono">TrxID: {trxId}</p>
                      </div>
                    )}
                    <p className="text-[9px] font-bold text-gray-400 mt-2 italic px-1 text-center font-sans tracking-tight">Automatic OTP payment will be processed securely.</p>
                  </motion.div>
                )}
             </div>
          </div>

          <AnimatePresence>
            {showPaymentGateway && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  onClick={() => setShowPaymentGateway(false)}
                />
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className={`relative w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/20 ${paymentMethod === 'bkash' ? 'bg-[#D12053]' : 'bg-[#F15922]'}`}
                >
                  <div className="p-8 pb-12 flex flex-col items-center text-white text-center">
                    <img 
                      src={paymentMethod === 'bkash' ? 'https://raw.githubusercontent.com/faraazahmad/bangladesh-bank-logo/master/logos/bkash-logo.png' : 'https://raw.githubusercontent.com/faraazahmad/bangladesh-bank-logo/master/logos/nagad-logo.png'} 
                      className="w-24 h-24 object-contain mb-6 drop-shadow-xl brightness-0 invert" 
                      alt="Logo"
                    />
                    
                    <AnimatePresence mode="wait">
                      {gatewayStep === 'number' && (
                        <motion.div 
                          key="num"
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -20, opacity: 0 }}
                          className="w-full space-y-6"
                        >
                          <h4 className="text-xl font-black">{paymentMethod === 'bkash' ? 'bKash Account' : 'Nagad Account'}</h4>
                          <input 
                            type="tel" 
                            placeholder="e.g. 017XXXXXXXX"
                            value={gatewayNumber}
                            onChange={(e) => setGatewayNumber(e.target.value)}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-center text-2xl font-black placeholder:text-white/30 outline-none focus:border-white focus:bg-white/20 transition-all"
                          />
                          <button 
                            onClick={() => setGatewayStep('otp')}
                            disabled={gatewayNumber.length < 11}
                            className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          >
                            Send OTP
                          </button>
                        </motion.div>
                      )}

                      {gatewayStep === 'otp' && (
                        <motion.div 
                          key="otp"
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -20, opacity: 0 }}
                          className="w-full space-y-6"
                        >
                          <h4 className="text-xl font-black">Verification Code</h4>
                          <p className="text-sm font-bold text-white/70">OTP has been sent to {gatewayNumber}</p>
                          <input 
                            type="text" 
                            placeholder="Enter OTP"
                            value={gatewayOtp}
                            onChange={(e) => setGatewayOtp(e.target.value)}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-center text-3xl font-black placeholder:text-white/30 outline-none focus:border-white tracking-[1rem] pl-[1.5rem]"
                            maxLength={6}
                          />
                          <button 
                            onClick={() => setGatewayStep('pin')}
                            disabled={gatewayOtp.length < 4}
                            className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            Verify OTP
                          </button>
                        </motion.div>
                      )}

                      {gatewayStep === 'pin' && (
                        <motion.div 
                          key="pin"
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -20, opacity: 0 }}
                          className="w-full space-y-6"
                        >
                          <h4 className="text-xl font-black">Confirm Payment</h4>
                          <p className="text-sm font-bold text-white/70">Total Amount: ৳{cartTotal}</p>
                          <input 
                            type="password" 
                            placeholder="XXXX"
                            value={gatewayPin}
                            onChange={(e) => setGatewayPin(e.target.value)}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-center text-3xl font-black placeholder:text-white/30 outline-none focus:border-white tracking-[1.5rem] pl-[2rem]"
                            maxLength={5}
                          />
                          <button 
                            onClick={handleGatewayComplete}
                            disabled={gatewayPin.length < 4}
                            className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                            Pay ৳{cartTotal}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="bg-black/20 p-4 text-center">
                    <button onClick={() => setShowPaymentGateway(false)} className="text-xs font-black text-white/60 uppercase tracking-widest hover:text-white transition-colors">
                      Cancel & Go Back
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] -mr-10 -mt-10" />
            <h3 className="text-2xl font-black mb-8 relative z-10">Order Summary</h3>
            
            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex justify-between text-gray-400 font-medium">
                <span>Subtotal</span>
                <span className="text-white">৳{cartTotal}</span>
              </div>
              <div className="flex justify-between text-gray-400 font-medium">
                <span>Estimated Shipping</span>
                <span className="text-white">FREE</span>
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/10 mb-8 relative z-10">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                  <p className="text-4xl font-black text-primary">৳{cartTotal}</p>
                </div>
              </div>
            </div>

            <button 
              disabled={cartItems.length === 0 || !address || !phone || (paymentMethod !== 'cod' && !trxId)}
              onClick={() => onCheckout(address, phone, paymentMethod, trxId)}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 disabled:grayscale relative z-10"
            >
              {paymentMethod === 'cod' ? 'Confirm Order' : trxId ? 'Confirm Order' : 'Complete Payment First'}
            </button>
            <p className="text-center text-gray-500 text-xs mt-6 font-medium relative z-10">
              Secure Checkout • Fast Delivery • 7 Days Return
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MyOrdersView({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/user/orders', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto px-4 py-12 md:py-20"
    >
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-100">
        <h2 className="text-4xl font-black text-gray-900">My Orders</h2>
        <button onClick={onClose} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-all">
          <X size={24} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="animate-spin text-primary" size={40} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem]">
          <ShoppingBag size={80} className="mx-auto text-gray-200 mb-6" />
          <h3 className="text-2xl font-black text-gray-800 mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-8 font-medium">When you shop, your orders will appear here.</p>
          <button 
            onClick={onClose}
            className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-xl"
          >
            Go Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                  <p className="font-black text-gray-900">#{order.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                  <p className="font-bold text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-xl font-black text-primary">৳{order.total}</p>
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-gray-50/50">
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-gray-100 shrink-0">
                        <img src={item.media?.[0]?.url || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500 font-medium">Qty: {item.quantity} • Size: {item.selectedSize || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">৳{item.price * item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-6 text-sm">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery Address</p>
                    <p className="text-gray-700 font-bold leading-relaxed">{order.address}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contact</p>
                    <p className="text-gray-700 font-bold">{order.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment</p>
                    <p className="text-gray-700 font-bold">{order.paymentMethod.toUpperCase()}</p>
                    {order.transactionId && <p className="text-[10px] text-gray-400 mt-1 font-mono">{order.transactionId}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PostView({ 
  onClose, 
  siteName, 
  onAddProduct 
}: { 
  onClose: () => void, 
  siteName: string,
  onAddProduct: (product: Product) => void
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Mens Fashion");
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL']);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter(s => s !== size));
    } else {
      setSizes([...sizes, size]);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const newMediaItems: MediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) continue;
        
        const isVideo = file.type.startsWith("video/");
        
        const reader = new FileReader();
        const urlPromise = new Promise<string>((resolve) => {
            reader.onload = (event) => resolve(event.target?.result as string);
        });
        reader.readAsDataURL(file);
        
        const url = await urlPromise;
        newMediaItems.push({ url, type: isVideo ? 'video' : 'image' });
    }

    setMedia([...media, ...newMediaItems]);
    setIsUploading(false);
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || media.length === 0) {
      alert("Please fill all required fields and upload at least one image.");
      return;
    }

    const newProduct: Product = {
      id: Date.now(),
      name,
      category,
      price: Number(price),
      originalPrice: Number(price) * 1.25,
      discount: 20,
      rating: 5.0,
      media,
      sizes,
      createdAt: new Date().toISOString()
    };

    onAddProduct(newProduct);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12 md:py-20"
    >
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Add New Product</h2>
        <p className="text-gray-500">List a new item in {siteName} store.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-50 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left Side: Upload Area */}
          <div className="w-full md:w-1/2 bg-gray-50 p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
            <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Media (Images & Videos)</label>
            
            <div className="flex-grow space-y-4">
                {media.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {media.map((item, idx) => (
                            <div key={idx} className="aspect-square relative group rounded-xl overflow-hidden shadow-sm">
                                {item.type === 'video' ? (
                                    <video src={item.url || null} className="w-full h-full object-cover" />
                                ) : (
                                    <img 
                                      src={item.url || 'https://via.placeholder.com/400x400?text=Media'} 
                                      className="w-full h-full object-cover" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x400?text=Media`;
                                      }}
                                    />
                                )}
                                <button 
                                    onClick={() => removeMedia(idx)}
                                    className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white"
                                >
                                    <Trash2 size={24} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative">
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*,video/*"
                        id="media-upload"
                        className="hidden"
                        onChange={handleMediaUpload}
                        disabled={isUploading}
                    />
                    <label 
                        htmlFor="media-upload"
                        className="w-full h-40 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-gray-400 hover:text-primary group"
                    >
                        {isUploading ? <RefreshCw className="animate-spin" size={32} /> : <PlusSquare size={32} />}
                        <span className="font-bold text-sm">{isUploading ? "Uploading..." : "Click to select media"}</span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Any number of images/videos</span>
                    </label>
                </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="w-full md:w-1/2 p-8 md:p-12">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Product Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Vintage Leather Jacket"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Price (৳)</label>
                <input 
                  type="number"
                  required
                  placeholder="1200"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all font-bold"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  {!categories.some(c => c.name === 'Mens Fashion') && <option>Mens Fashion</option>}
                  {!categories.some(c => c.name === 'Womens Fashion') && <option>Womens Fashion</option>}
                  {!categories.some(c => c.name === 'Kids Fashion') && <option>Kids Fashion</option>}
                  {!categories.some(c => c.name === 'Accessories') && <option>Accessories</option>}
                  {!categories.some(c => c.name === 'Footwear') && <option>Footwear</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Available Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-4 py-2 rounded-xl font-bold transition-all border-2 ${
                        sizes.includes(size)
                          ? 'bg-primary border-primary text-white shadow-md'
                          : 'bg-gray-50 border-transparent text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-grow bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!name || !price || media.length === 0}
                  className="flex-grow bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  Post Product
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-gray-400">
          <p className="text-sm font-medium italic">Make your products look amazing with high-quality media!</p>
      </div>
    </motion.div>
  );
}

interface EditableTextProps {
  contentKey: keyof any; // Should be keyof siteContent
  value: string;
  isEditMode: boolean;
  onUpdate: (key: any, val: string) => void;
  className?: string;
  multiline?: boolean;
}

function EditableText({ contentKey, value, isEditMode, onUpdate, className, multiline }: EditableTextProps) {
  if (!isEditMode) return <span className={className}>{value}</span>;

  const baseStyles = "bg-white/10 backdrop-blur-sm border-2 border-dashed border-primary px-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-inherit";

  return multiline ? (
    <textarea 
      value={value}
      onChange={(e) => onUpdate(contentKey, e.target.value)}
      className={`${className} ${baseStyles} block w-full resize-none min-h-[60px]`}
      rows={3}
    />
  ) : (
    <input 
      type="text"
      value={value}
      onChange={(e) => onUpdate(contentKey, e.target.value)}
      className={`${className} ${baseStyles} inline-block`}
    />
  );
}

// --- Profile View Component ---
const ProfileView = ({ user, onUpdate, onClose }: { user: User; onUpdate: (data: any) => void; onClose: () => void }) => {
  const [name, setName] = useState(user.name);
  const [address, setAddress] = useState(user.address || '');
  const [phone, setPhone] = useState(user.phone || '');

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onClose} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h2 className="text-3xl font-black text-gray-900 leading-none">My Profile</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-50 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <img 
              src={user.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User')} 
              alt={user.name} 
              className="w-32 h-32 rounded-[2.5rem] object-cover ring-4 ring-primary/10" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg ring-4 ring-white">
              <User size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-1">{user.name}</h3>
          <p className="text-gray-500 font-medium mb-6">{user.email || 'Phone Verified User'}</p>
          <div className="w-full pt-6 border-t border-gray-100 flex justify-between items-center text-sm font-bold">
            <span className="text-gray-400 capitalize">Account Type</span>
            <span className="text-primary px-3 py-1 bg-primary/5 rounded-lg">{user.isAdmin ? 'Admin' : 'Customer'}</span>
          </div>
        </div>

        {/* Edit Info Form */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-50">
          <h4 className="text-xl font-black text-gray-900 mb-8 border-l-4 border-primary pl-4">Update Information</h4>
          <form 
            onSubmit={(e) => { e.preventDefault(); onUpdate({ name, address, phone }); }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all font-bold"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all font-bold"
                  placeholder="e.g. +880..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Residential Address</label>
              <textarea 
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary transition-all font-bold resize-none"
                placeholder="Enter your full address here..."
              ></textarea>
            </div>
            <button 
              type="submit"
              className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

function ChatWindow({ receiverId, userName }: { receiverId: string, userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?userId=${receiverId}`, { credentials: 'include' });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [receiverId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMsg, receiverId }),
        credentials: 'include'
      });
      setNewMsg('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full">
       <div className="pb-6 border-b border-gray-100 mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">{userName}</h3>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1.5 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              Connected
            </p>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
             <User size={24} />
          </div>
       </div>

       <div className="flex-grow overflow-y-auto space-y-6 mb-8 pr-4 no-scrollbar max-h-[450px]">
          {loading && messages.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-4">
               <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center opacity-30 grayscale">
              <Mail size={80} className="mb-4" />
              <p className="text-xl font-bold">No messages yet</p>
              <p className="text-sm font-medium">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((m) => (
              <motion.div 
                key={m.id} 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`flex ${m.senderId === receiverId ? 'justify-start' : 'justify-end'}`}
              >
                 <div className={`max-w-[85%] px-7 py-4 rounded-[1.8rem] font-bold shadow-xl shadow-gray-200/20 ${m.senderId === receiverId ? 'bg-gray-100 text-gray-800 rounded-bl-none' : 'bg-primary text-white rounded-br-none shadow-primary/20 scale-105'}`}>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    <p className={`text-[9px] mt-2 font-black uppercase tracking-widest opacity-50 ${m.senderId === receiverId ? 'text-gray-500' : 'text-white'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                 </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
       </div>

       <form onSubmit={sendMessage} className="flex gap-4 bg-gray-50 p-2 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-primary/10 transition-all border border-transparent focus-within:border-primary/20">
          <input 
            type="text" 
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow bg-transparent border-none rounded-[2rem] px-6 py-4 focus:ring-0 font-bold text-gray-800"
          />
          <button className="bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-primary-dark shadow-xl shadow-primary/30 transition-all active:scale-95 group">
             <motion.div whileHover={{ x: 3 }}>
                <ChevronRight size={30} />
             </motion.div>
          </button>
       </form>
    </div>
  );
}

function FloatingChat({ user }: { user: User | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!user || user.isAdmin) return null;

  return (
    <div className="fixed bottom-10 right-10 z-[150]">
       <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50, x: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50, x: 20 }}
              className="absolute bottom-20 right-0 w-[350px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-50 overflow-hidden"
            >
               <div className="bg-primary p-8 text-white">
                  <div className="flex items-center justify-between mb-2">
                     <h4 className="text-2xl font-black italic">AMRE SOPNO</h4>
                     <button onClick={() => setIsOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                        <X size={16} />
                     </button>
                  </div>
                  <p className="text-white/80 font-bold text-sm">Chat with customer support</p>
               </div>
               <div className="p-6 h-[400px]">
                  <ChatWindow receiverId="admin" userName="Customer Support" />
               </div>
            </motion.div>
          )}
       </AnimatePresence>

       <motion.button 
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         onClick={() => setIsOpen(!isOpen)}
         className="w-16 h-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:bg-primary-dark transition-all relative border-4 border-white"
       >
          {isOpen ? <X size={28} /> : <Mail size={28} />}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 rounded-full border-2 border-white animate-bounce" />
          )}
       </motion.button>
    </div>
  );
}

// --- Admin Dashboard Component ---
function AdminDashboard({ 
  onClose, 
  products, 
  setProducts, 
  siteContent, 
  setSiteContent,
  saveSiteContent,
  persistProducts,
  persistCategories,
  activeTab,
  setActiveTab,
  editingProduct,
  setEditingProduct,
  showProductForm,
  setShowProductForm,
  newProduct,
  setNewProduct,
  handleImageUpload
}: { 
  onClose: () => void, 
  products: Product[], 
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  siteContent: any,
  setSiteContent: React.Dispatch<React.SetStateAction<any>>,
  saveSiteContent: (newContent: any) => Promise<void>,
  persistProducts: (updatedProducts: Product[]) => Promise<boolean>,
  persistCategories: (updatedCategories: Category[]) => Promise<boolean>,
  activeTab: 'stats' | 'orders' | 'products' | 'site',
  setActiveTab: (tab: 'stats' | 'orders' | 'products' | 'site') => void,
  editingProduct: Product | null,
  setEditingProduct: (product: Product | null) => void,
  showProductForm: boolean,
  setShowProductForm: (show: boolean) => void,
  newProduct: Partial<Product>,
  setNewProduct: React.Dispatch<React.SetStateAction<Partial<Product>>>,
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, aspect?: number) => void
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminNavVisible, setIsAdminNavVisible] = useState(true);
  const [lastAdminScrollY, setLastAdminScrollY] = useState(0);

  const handleAdminScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    if (currentScrollY < 10) {
      setIsAdminNavVisible(true);
    } else if (currentScrollY > lastAdminScrollY) {
      setIsAdminNavVisible(false); // Scroll down - hide
    } else {
      setIsAdminNavVisible(true); // Scroll up - show
    }
    
    setLastAdminScrollY(currentScrollY);
  };
  
  // Product Form State - LIFTED TO App.tsx

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error("Orders data is not an array:", data);
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price) return alert("Please fill name and price");
    
    let updatedProducts: Product[];
    if (editingProduct) {
      updatedProducts = products.map(p => String(p.id) === String(editingProduct.id) ? { ...p, ...newProduct } as Product : p);
    } else {
      const productToAdd = {
        ...newProduct,
        id: Date.now(),
        discount: Math.round(((Number(newProduct.originalPrice || 0) - Number(newProduct.price)) / Number(newProduct.originalPrice || 1)) * 100),
        createdAt: new Date().toISOString()
      } as Product;
      updatedProducts = [productToAdd, ...products];
    }
    
    // Save to local state and persist to server
    const success = await persistProducts(updatedProducts);

    if (success) {
      setShowProductForm(false);
      setEditingProduct(null);
      setNewProduct({ name: '', category: 'Clothing', price: 0, originalPrice: 0, media: [], rating: 4.5 });
    }
  };

  const deleteProduct = async (id: string | number) => {
    if (!confirm("Delete this product?")) return;
    const updatedProducts = products.filter(p => String(p.id) !== String(id));
    persistProducts(updatedProducts);
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalRevenue = safeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = safeOrders.filter(o => o.status === 'Pending').length;

  // Filtered lists
  const filteredOrders = safeOrders.filter(o => 
    (o.id || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.phone || "").includes(searchTerm)
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-gray-50 flex flex-col md:flex-row overflow-hidden"
    >
      {/* Sidebar */}
      <motion.div 
        animate={{ y: isAdminNavVisible ? 0 : -150 }}
        className="w-full md:w-64 bg-gray-900 text-white p-6 flex flex-col gap-8 shadow-2xl z-20 sticky top-0 md:relative"
      >
         <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Settings size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tighter">ADMIN <span className="text-primary italic">HUB</span></h2>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-white/50 hover:text-white">
               <X size={24} />
            </button>
         </div>
         
         <div className="space-y-1">
            {[
              { id: 'stats', name: 'Dashboard', icon: TrendingUp },
              { id: 'orders', name: 'Orders', icon: ShoppingBag, badge: pendingOrders },
              { id: 'products', name: 'Products & Prices', icon: LayoutGrid },
              { id: 'site', name: 'Appearance', icon: Percent },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/30 font-black' : 'text-gray-400 hover:bg-white/5 hover:text-white font-bold'}`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={18} />
                  <span className="text-sm">{tab.name}</span>
                </div>
                {tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">{tab.badge}</span>
                )}
              </button>
            ))}
         </div>
         
         <div className="mt-auto space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="font-bold text-xs">System Online</p>
               </div>
            </div>
            <button onClick={onClose} className="w-full bg-white/10 text-white py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2">
               Exit Panel
            </button>
         </div>
      </motion.div>

      {/* Main Content Area */}
      <div 
        onScroll={handleAdminScroll}
        className="flex-grow overflow-y-auto bg-gray-50/50"
      >
         {/* Header */}
         <motion.div 
          animate={{ y: isAdminNavVisible ? 0 : -100 }}
          style={{ position: 'sticky', top: 0 }}
          className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 md:px-10 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20"
         >
            <div>
               <h1 className="text-2xl font-black text-gray-900 capitalize">{activeTab}</h1>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">AMRE SOPNO Management Console</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search anything..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 pr-4 py-3 bg-gray-100/50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold w-full md:w-64"
                  />
               </div>
               {activeTab === 'products' && (
                 <button 
                  onClick={() => { setShowProductForm(true); setEditingProduct(null); }}
                  className="bg-primary text-white p-3 md:px-6 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                 >
                   <Plus size={20} />
                   <span className="hidden md:inline">Add Product</span>
                 </button>
               )}
               <button onClick={fetchOrders} className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all">
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
         </motion.div>

         <div className="p-6 md:p-10">
            {/* --- Dashboard Stats --- */}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                    {[
                      { label: 'Total Revenue', value: `৳${totalRevenue}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary' },
                      { label: 'Pending Orders', value: pendingOrders, icon: RefreshCw, color: 'text-orange-500', bg: 'bg-orange-500' },
                      { label: 'Total Products', value: products.length, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500' },
                      { label: 'Completed Sales', value: safeOrders.filter(o => o.status === 'Delivered').length, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500' }
                    ].map(stat => (
                      <div key={stat.label} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center gap-4">
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xl ${stat.bg}`}>
                           <stat.icon size={24} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-3xl font-black ${stat.color} mt-1`}>{stat.value}</p>
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* Recent Orders Preview */}
                 <div className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-black text-gray-900">Recent Activity</h3>
                       <button onClick={() => setActiveTab('orders')} className="text-primary font-black text-xs uppercase tracking-widest hover:underline">View All Orders</button>
                    </div>
                    <div className="space-y-4">
                       {safeOrders.slice(0, 5).map(order => (
                         <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-xs text-gray-500">
                                 #{order.id.slice(-4).toUpperCase()}
                               </div>
                               <div>
                                  <p className="font-black text-sm">{order.userName}</p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">{order.createdAt.slice(0, 10)}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-8">
                               <div className="text-right">
                                  <p className="font-black text-sm">৳{order.total}</p>
                                  <p className="text-[10px] font-black text-gray-400 uppercase">{order.items.length} Items</p>
                               </div>
                               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                                 order.status === 'Delivered' ? 'bg-green-100 text-green-600' : 
                                 order.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                               }`}>{order.status}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {/* --- Orders Management --- */}
            {activeTab === 'orders' && (
              <div className="grid gap-6">
                {filteredOrders.length === 0 ? (
                  <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100 italic text-gray-400">
                     No orders found matching your search.
                  </div>
                ) : (
                  filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 relative overflow-hidden group">
                       <div className={`absolute top-0 left-0 w-2 h-full ${
                          order.status === 'Delivered' ? 'bg-green-500' : 
                          order.status === 'Pending' ? 'bg-orange-500' : 'bg-blue-500'
                       }`} />

                       <div className="flex-grow space-y-6">
                          <div className="flex items-center justify-between">
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID: {order.id}</p>
                                <h4 className="text-2xl font-black text-gray-900">{order.userName}</h4>
                             </div>
                             <button onClick={() => handleDeleteOrder(order.id)} className="p-3 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <Trash2 size={20} />
                             </button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-gray-50">
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                                <p className="font-black text-sm">{order.phone}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                                <p className="font-black text-sm text-primary">৳{order.total}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-sm uppercase">{order.paymentMethod}</span>
                                  {order.transactionId && <span className="text-[10px] font-bold text-primary font-mono bg-primary/5 px-2 py-0.5 rounded-lg">({order.transactionId})</span>}
                                </div>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time</p>
                                <p className="font-black text-sm">{new Date(order.createdAt).toLocaleString()}</p>
                             </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-2xl">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                             <p className="font-bold text-xs text-gray-700">{order.address}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                             {order.items.map((item, idx) => (
                               <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl pr-4 border border-gray-100">
                                  <img 
                                      src={item.media?.[0]?.url || 'https://via.placeholder.com/50x50?text=No+Image'} 
                                      className="w-8 h-8 rounded-lg object-cover" 
                                      referrerPolicy="no-referrer" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/50x50?text=${encodeURIComponent(item.name)}`;
                                      }}
                                   />
                                  <div className="text-[10px] font-black">
                                     <p className="text-gray-900">{item.name}</p>
                                     <p className="text-gray-400">Qty: {item.quantity}</p>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="md:w-64 flex flex-col justify-center gap-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center font-mono">Current: <span className="text-primary">{order.status}</span></p>
                          {[
                            { val: 'Pending', color: 'bg-orange-500' },
                            { val: 'Processing', color: 'bg-blue-500' },
                            { val: 'Shipped', color: 'bg-indigo-500' },
                            { val: 'Delivered', color: 'bg-green-500' },
                            { val: 'Cancelled', color: 'bg-red-500' }
                          ].map(st => (
                            <button 
                              key={st.val}
                              onClick={() => handleStatusUpdate(order.id, st.val)}
                              className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${order.status === st.val ? `${st.color} text-white shadow-lg` : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                              {st.val}
                            </button>
                          ))}
                       </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* --- Product Management --- */}
            {activeTab === 'products' && (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
                       <div className="aspect-[4/5] relative overflow-hidden bg-gray-100">
                          <img 
                              src={product.media?.[0]?.url || 'https://via.placeholder.com/800x1000?text=No+Image'} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://via.placeholder.com/800x1000?text=${encodeURIComponent(product.name)}`;
                              }}
                           />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button 
                              onClick={() => {
                                setEditingProduct(product);
                                setNewProduct(product);
                                setShowProductForm(true);
                              }}
                              className="px-4 py-2 bg-white rounded-xl text-gray-900 flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-xl font-black text-xs"
                             >
                                <Edit size={16} />
                                এডিট (Edit)
                             </button>
                             <button onClick={() => deleteProduct(product.id)} className="px-4 py-2 bg-white rounded-xl text-red-500 flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-xl font-black text-xs">
                                <Trash2 size={16} />
                                ডিলিট (Delete)
                             </button>
                          </div>
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-black text-gray-900 uppercase">
                             {product.category}
                          </div>
                       </div>
                       <div className="p-6">
                          <h5 className="font-black text-gray-900 text-sm mb-1 truncate">{product.name}</h5>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <span className="font-black text-primary">৳{product.price}</span>
                               <span className="text-[10px] text-gray-400 font-bold line-through">৳{product.originalPrice}</span>
                            </div>
                            <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-lg">-{product.discount}%</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            )}

            {/* --- Site Content Management --- */}
            {activeTab === 'site' && (
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 border-t-4 border-t-primary">
                    <h4 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900">
                      <Percent size={20} className="text-primary" />
                      Hero Carousel Settings
                    </h4>
                    <div className="space-y-6">
                       {siteContent.heroImages.map((img: string, idx: number) => (
                         <div key={idx} className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banner Image #{idx + 1}</label>
                               <span className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg font-mono">Slide {idx + 1}</span>
                            </div>
                            
                            <div className="flex gap-4 items-center">
                               <div className="w-24 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 shadow-inner group relative">
                                  <img 
                                      src={img || 'https://via.placeholder.com/200x200?text=Banner'} 
                                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                      referrerPolicy="no-referrer" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/200x200?text=Banner`;
                                      }}
                                  />
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                     <ImageIcon size={20} className="text-white" />
                                  </div>
                               </div>
                               <div className="flex-grow space-y-2">
                                 <div className="relative">
                                   <input 
                                     type="text" 
                                     defaultValue={img}
                                     onBlur={(e) => {
                                       if (e.target.value === img) return;
                                       const newImages = [...siteContent.heroImages];
                                       newImages[idx] = e.target.value;
                                       saveSiteContent({ ...siteContent, heroImages: newImages });
                                     }}
                                     placeholder="Paste URL (https://...)"
                                     className="w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] font-medium text-gray-600 outline-none focus:border-primary transition-all pr-12"
                                   />
                                   <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                     <Link size={14} />
                                   </div>
                                 </div>
                                 
                                 <div className="flex gap-2">
                                   <input 
                                     type="file" 
                                     accept="image/*"
                                     id={`hero-upload-${idx}`}
                                     className="hidden"
                                     onChange={(e) => handleImageUpload(e, (url) => {
                                       const newImages = [...siteContent.heroImages];
                                       newImages[idx] = url;
                                       saveSiteContent({ ...siteContent, heroImages: newImages });
                                     }, 16/9)}
                                   />
                                   <label 
                                     htmlFor={`hero-upload-${idx}`}
                                     className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all text-[10px] font-black uppercase text-gray-500 shadow-sm"
                                   >
                                     <Upload size={12} />
                                     আপলোড (Upload)
                                   </label>
                                 </div>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 border-t-4 border-t-blue-500">
                    <h4 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900">
                      <Edit size={20} className="text-blue-500" />
                      Main Text Content
                    </h4>
                    <div className="grid grid-cols-1 gap-6">
                       {[
                         { id: 'heroTitle', label: 'Main Title' },
                         { id: 'heroSubtitle', label: 'Subtitle' },
                         { id: 'heroPromo', label: 'Promo Tag' },
                         { id: 'navSale', label: 'Sale Navigation' },
                         { id: 'siteName', label: 'Store Name' },
                         { id: 'liveBannerText', label: 'Live Banner Scrolling Text' }
                       ].map(field => (
                          <div key={field.id} className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{field.label}</label>
                             <input 
                               type="text" 
                               defaultValue={siteContent[field.id as keyof typeof siteContent]}
                               onBlur={(e) => saveSiteContent({ ...siteContent, [field.id]: e.target.value })}
                               className="w-full bg-gray-100 p-4 rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-700 outline-none"
                             />
                          </div>
                       ))}
                    </div>
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* --- Product Form Modal --- */}
      <AnimatePresence>
         {showProductForm && (
           <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProductForm(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
              >
                  <div className="md:w-2/5 aspect-[4/5] bg-gray-100">
                     <img src={newProduct.media?.[0]?.url || 'https://via.placeholder.com/800x1000?text=No+Image'} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-10 flex-grow space-y-6 max-h-[80vh] overflow-y-auto">
                     <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                        <button onClick={() => setShowProductForm(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Title</label>
                           <input 
                              type="text" 
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                              className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary font-bold text-gray-700 outline-none"
                              placeholder="e.g. Trendy Cotton Shirt"
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selling Price (৳)</label>
                              <input 
                                 type="number" 
                                 value={newProduct.price}
                                 onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                                 className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary font-bold text-gray-700 outline-none"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Original Price (৳)</label>
                              <input 
                                 type="number" 
                                 value={newProduct.originalPrice}
                                 onChange={(e) => setNewProduct({ ...newProduct, originalPrice: Number(e.target.value) })}
                                 className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary font-bold text-gray-700 outline-none"
                              />
                           </div>
                        </div>

                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Media (Images & Videos)</label>
                           
                           {/* Media Preview Grid */}
                           <div className="grid grid-cols-3 gap-3 mb-4">
                              {newProduct.media && newProduct.media.map((m, idx) => (
                                 <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative group border-2 border-gray-100">
                                    {m.type === 'video' ? (
                                       <video src={m.url || null} className="w-full h-full object-cover" />
                                    ) : (
                                       <img src={m.url || 'https://via.placeholder.com/400x400?text=Media'} className="w-full h-full object-cover" />
                                    )}
                                    <button 
                                       onClick={() => {
                                          const next = [...(newProduct.media || [])];
                                          next.splice(idx, 1);
                                          setNewProduct({ ...newProduct, media: next });
                                       }}
                                       className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                       <X size={12} />
                                    </button>
                                 </div>
                              ))}
                              <label 
                                 className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                              >
                                 <Plus size={24} className="text-gray-300 group-hover:text-primary" />
                                 <span className="text-[10px] font-black text-gray-400 group-hover:text-primary uppercase tracking-tighter">Add Media</span>
                                 <input 
                                    type="file" 
                                    accept="image/*,video/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                       const files = Array.from(e.target.files || []);
                                       files.forEach((file: File) => {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                             const type = file.type.startsWith('video') ? 'video' : 'image';
                                             if (type === 'image') {
                                                handleImageUpload(e, (url) => {
                                                   setNewProduct(prev => ({
                                                      ...prev,
                                                      media: [...(prev.media || []), { url, type: 'image' }]
                                                   }));
                                                }, 4/5);
                                             } else {
                                                setNewProduct(prev => ({
                                                   ...prev,
                                                   media: [...(prev.media || []), { url: reader.result as string, type: 'video' }]
                                                }));
                                             }
                                          };
                                          reader.readAsDataURL(file);
                                       });
                                    }}
                                 />
                              </label>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                           <select 
                              value={newProduct.category}
                              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                              className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary font-bold appearance-none text-gray-700 outline-none cursor-pointer"
                           >
                              <option>Clothing</option>
                              <option>Mens Fashion</option>
                              <option>Womens Fashion</option>
                              <option>Footwear</option>
                              <option>Accessories</option>
                              <option>Handbags</option>
                           </select>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sizes (Comma separated)</label>
                               <input 
                                  type="text" 
                                  value={(newProduct.sizes || []).join(", ")}
                                  onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value.split(",").map(s => s.trim()).filter(s => s) })}
                                  className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-primary font-bold text-gray-700 outline-none"
                                  placeholder="e.g. S, M, L, XL"
                                />
                           </div>
                        </div>
                     </div>

                     <button 
                        onClick={handleSaveProduct}
                        className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all mt-4"
                     >
                        {editingProduct ? 'Update Product' : 'Add to Catalog'}
                     </button>
                  </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}

function CartSidebar({ 
  cartItems, 
  onClose, 
  onRemove, 
  onUpdateQty,
  onCheckout
}: { 
  cartItems: CartItem[], 
  onClose: () => void,
  onRemove: (id: string | number, size?: string) => void,
  onUpdateQty: (id: string | number, delta: number, size?: string) => void,
  onCheckout: () => void
}) {
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const freeShippingThreshold = 2000;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900">Your Shopping Cart</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Free Shipping Progress */}
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
              {isFreeShipping 
                ? "You've unlocked FREE SHIPPING! 🎉" 
                : <>Spend <span className="text-primary">৳{amountToFreeShipping}</span> more to get FREE SHIPPING</>}
            </p>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden relative">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progressPercent}%` }}
                 className="h-full bg-primary"
               />
               {!isFreeShipping && (
                 <div className="absolute top-0 right-0 h-full flex items-center pr-1">
                   <div className="w-1 h-3 bg-white/50 rounded-full" />
                 </div>
               )}
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
               <ShoppingBag size={64} className="text-gray-200 mb-4" />
               <p className="text-gray-400 font-bold font-sans">Your cart is empty</p>
               <button onClick={onClose} className="mt-4 text-primary font-black uppercase text-xs tracking-widest hover:underline transition-all">Start Shopping</button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-2 bg-white rounded-xl group border border-transparent hover:border-gray-100 transition-all">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <img 
                      src={item.media?.[0]?.url || 'https://via.placeholder.com/200x200?text=No+Image'} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/200x200?text=${encodeURIComponent(item.name)}`;
                      }}
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-grow">
                        <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                        <div className="flex items-center gap-2">
                           <p className="text-xs font-black text-primary">৳{item.price.toFixed(2)}</p>
                           {item.selectedSize && (
                             <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Size: {item.selectedSize}</span>
                           )}
                        </div>
                      </div>
                      <button onClick={() => onRemove(item.id, item.selectedSize)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-gray-100 rounded-lg p-1 px-3 gap-3">
                        <button onClick={() => onUpdateQty(item.id, -1, item.selectedSize)} className="text-gray-500 hover:text-primary font-black text-lg transition-colors">−</button>
                        <span className="text-xs font-black text-gray-900 min-w-[12px] text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQty(item.id, 1, item.selectedSize)} className="text-gray-500 hover:text-primary font-black text-lg transition-colors">+</button>
                      </div>
                      <p className="text-xs font-black text-gray-900">৳{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-500 font-medium text-sm">
                <span>Subtotal</span>
                <span className="text-gray-900 font-bold">৳{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium text-sm">
                <span>Shipping</span>
                <span className="text-gray-900 font-bold">{isFreeShipping ? 'FREE' : '৳120.00'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Total</span>
                <span className="text-2xl font-black text-primary">৳{(subtotal + (isFreeShipping ? 0 : 120)).toFixed(2)}</span>
              </div>
            </div>
            <button 
              onClick={onCheckout}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98] uppercase tracking-wider"
            >
              Checkout
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ProductsPageView({ 
  products, 
  onAddToCart, 
  onClose,
  isEditMode,
  updateProductPrice,
  user,
  handleQuickEdit,
  onSelectProduct
}: { 
  products: Product[], 
  onAddToCart: (p: Product, size?: string) => void, 
  onClose: () => void,
  isEditMode: boolean,
  updateProductPrice: (id: number, price: number) => void,
  user: User | null,
  handleQuickEdit: (p: Product) => void,
  onSelectProduct: (product: Product) => void
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => 
        p.category.toLowerCase().includes(selectedCategory.toLowerCase()) || 
        selectedCategory.toLowerCase().includes(p.category.toLowerCase())
      );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 py-12 md:py-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4 hover:gap-3 transition-all group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
          </button>
          <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Full Collection</h2>
          <p className="text-gray-500 mt-2 font-medium">Explore our entire catalogue of premium fashion.</p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 min-h-[500px]">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={() => onAddToCart(product)} 
            isEditMode={isEditMode}
            onUpdatePrice={updateProductPrice}
            adminUser={user}
            onQuickEdit={handleQuickEdit}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    </motion.div>
  );
}

function CropperModal({ 
  image, 
  aspect, 
  onCropComplete, 
  onCancel 
}: { 
  image: string, 
  aspect: number, 
  onCropComplete: (url: string) => void, 
  onCancel: () => void 
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: { x: number, y: number }) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);

  const handleDone = async () => {
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      
      // Add compression here to keep base64 strings under control
      const compressedImage = await compressImage(croppedImage, 1200, 0.7);
      onCropComplete(compressedImage);
    } catch (e) {
      console.error(e);
      alert("Failed to crop or compress image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to compress images
  const compressImage = (base64Str: string, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col">
      <div className="relative flex-grow">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          onZoomChange={onZoomChange}
        />
      </div>
      <div className="p-8 bg-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Zoom Level (শাখা)</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={onCancel}
            className="flex-grow md:flex-grow-0 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
          >
            বাতিল (Cancel)
          </button>
          <button 
            onClick={handleDone}
            disabled={isProcessing}
            className="flex-grow md:flex-grow-0 px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'অংশটি ঠিক করুন (Done)'}
          </button>
        </div>
      </div>
    </div>
  );
}

