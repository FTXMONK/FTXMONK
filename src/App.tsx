/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import React, { useRef, useState, useEffect } from "react";
import { Youtube, ChevronDown, Plus, Trash2, ExternalLink, LogIn, LogOut, Shield, X, Loader2, Star, MessageSquare, TrendingUp, Users, MapPin, Bell } from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth, signInWithGoogle, logout, handleFirestoreError, OperationType } from "./firebase";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

const chartData = [
  { name: "Mon", views: 4000 },
  { name: "Tue", views: 3000 },
  { name: "Wed", views: 5000 },
  { name: "Thu", views: 2780 },
  { name: "Fri", views: 6890 },
  { name: "Sat", views: 8390 },
  { name: "Sun", views: 9490 },
];

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  createdAt: Timestamp;
  authorUid: string;
}

interface Review {
  id: string;
  text: string;
  rating: number;
  userName: string;
  userPhoto: string;
  authorUid: string;
  createdAt: Timestamp;
}

interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  lastLogin: Timestamp;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "resources" | "reviews" | "users">("home");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax transforms
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  const ADMIN_EMAIL = "mayankand1234@gmail.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      const isAdm = u?.email === ADMIN_EMAIL;
      setIsAdmin(isAdm);
      setLoading(false);

      if (u) {
        // Save/Update user data in Firestore
        try {
          await setDoc(doc(db, "users", u.uid), {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || "Anonymous",
            photoURL: u.photoURL || "",
            role: isAdm ? "admin" : "user",
            lastLogin: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error saving user data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "resources") {
      const q = query(collection(db, "resources"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const res = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Resource[];
        setResources(res);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "resources");
      });
      return () => unsubscribe();
    } else if (activeTab === "reviews") {
      const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const res = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        setReviews(res);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "reviews");
      });
      return () => unsubscribe();
    } else if (activeTab === "users" && isAdmin) {
      const q = query(collection(db, "users"), orderBy("lastLogin", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const res = snapshot.docs.map(doc => ({
          ...doc.data()
        })) as UserDoc[];
        setUsersList(res);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      });
      return () => unsubscribe();
    }
  }, [activeTab, isAdmin]);

  const handleAddReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const newReview = {
      text: formData.get("text") as string,
      rating: reviewRating,
      userName: user.displayName || "Anonymous",
      userPhoto: user.photoURL || "",
      authorUid: user.uid,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "reviews"), newReview);
      setIsAddingReview(false);
      setReviewRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "reviews");
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reviews", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${id}`);
    }
  };

  const handleAddResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;

    const formData = new FormData(e.currentTarget);
    const newResource = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      url: formData.get("url") as string,
      category: formData.get("category") as string,
      createdAt: serverTimestamp(),
      authorUid: user?.uid,
    };

    try {
      await addDoc(collection(db, "resources"), newResource);
      setIsAddingResource(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "resources");
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, "resources", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `resources/${id}`);
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-sith-black overflow-x-hidden selection:bg-sith-red selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-glass">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="w-8 h-8 bg-sith-red rounded-sm flex items-center justify-center shadow-red-glow">
              <span className="font-orbitron font-black text-xs text-white">F</span>
            </div>
            <span className="font-orbitron font-bold tracking-widest text-sm hidden sm:block">FTXMONK</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setActiveTab("home")}
              className={`font-orbitron text-[10px] tracking-[0.2em] uppercase transition-colors ${activeTab === "home" ? "text-sith-red" : "text-gray-400 hover:text-white"}`}
            >
              Home
            </button>
            <button 
              onClick={() => setActiveTab("resources")}
              className={`font-orbitron text-[10px] tracking-[0.2em] uppercase transition-colors ${activeTab === "resources" ? "text-sith-red" : "text-gray-400 hover:text-white"}`}
            >
              Resources
            </button>
            <button 
              onClick={() => setActiveTab("reviews")}
              className={`font-orbitron text-[10px] tracking-[0.2em] uppercase transition-colors ${activeTab === "reviews" ? "text-sith-red" : "text-gray-400 hover:text-white"}`}
            >
              Reviews
            </button>
            {isAdmin && (
              <button 
                onClick={() => setActiveTab("users")}
                className={`font-orbitron text-[10px] tracking-[0.2em] uppercase transition-colors ${activeTab === "users" ? "text-sith-red" : "text-gray-400 hover:text-white"}`}
              >
                Users
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && <Shield size={16} className="text-sith-red animate-pulse" />}
              <button onClick={logout} className="text-gray-400 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
              <img src={user.photoURL || ""} alt="Profile" className="w-8 h-8 rounded-full border border-white/10" />
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-orbitron uppercase tracking-widest">
              <LogIn size={18} /> <span className="hidden sm:inline">Login</span>
            </button>
          )}

          <motion.a
            href="https://www.youtube.com/@FTXMONK"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-6 py-2 bg-sith-red text-white font-orbitron font-bold text-xs tracking-[0.2em] rounded-sm overflow-hidden transition-all duration-300 hover:shadow-red-glow-strong"
          >
            <span className="relative z-10 flex items-center gap-2">
              ENTER CHANNEL <Youtube size={14} />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </motion.a>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero Section */}
            <section className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
              <motion.div style={{ y: bgY, scale }} className="absolute inset-0 z-0">
                <img
                  src="https://i.postimg.cc/CLdk3ZPv/Mac-Book-Pro-closing-202604141403-ezgif-com-video-to-webp-converter.webp"
                  alt="Hero Background"
                  className="w-full h-full object-cover opacity-60 grayscale brightness-50"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-sith-black/80 via-transparent to-sith-black" />
              </motion.div>

              <motion.div style={{ y: textY, opacity }} className="relative z-10 text-center px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="mb-4">
                  <span className="font-orbitron text-sith-red tracking-[0.5em] text-xs font-bold uppercase">The Future of Tech</span>
                </motion.div>
                
                <motion.h1 initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} className="font-orbitron text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white text-glow-red">
                  FTXMONK
                </motion.h1>
                
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1 }} className="mt-8 max-w-lg mx-auto">
                  <p className="text-gray-400 font-light tracking-wide text-sm md:text-base leading-relaxed">
                    Experience the convergence of high-end hardware and cinematic storytelling. 
                    Unveiling the dark side of technology.
                  </p>
                </motion.div>
              </motion.div>

              <motion.div style={{ opacity }} animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                <span className="font-orbitron text-[10px] tracking-[0.3em] text-gray-500 uppercase">Scroll to Explore</span>
                <ChevronDown className="text-sith-red" size={20} />
              </motion.div>
            </section>

            <section className="relative z-20 bg-sith-black px-6 py-24 md:py-40">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                  <h2 className="font-orbitron text-3xl md:text-5xl font-bold mb-6 text-white">
                    <span className="text-sith-red">CINEMATIC</span> PRECISION
                  </h2>
                  <p className="text-gray-400 text-lg leading-relaxed mb-8">
                    Every frame, every pixel, every sound is meticulously crafted to deliver an unparalleled viewing experience. 
                    FTXMONK isn't just a channel; it's a digital sanctuary for tech enthusiasts.
                  </p>
                  <div className="flex gap-4">
                    <div className="h-[1px] w-12 bg-sith-red mt-3" />
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Est. 2026</p>
                  </div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative aspect-video bg-sith-charcoal rounded-lg overflow-hidden border border-white/5 shadow-2xl group">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/EXRGrWuPr4g?autoplay=0&mute=0&controls=1&rel=0"
                    title="FTXMONK Cinematic Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-sith-red/30 transition-colors duration-500 rounded-lg" />
                </motion.div>
              </div>
            </section>

            {/* Bento Grid Showcase */}
            <section className="relative z-20 bg-sith-black px-6 pb-40">
              <div className="max-w-7xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }}
                  className="text-center mb-16"
                >
                  <h2 className="font-orbitron text-3xl md:text-5xl font-black text-white mb-4">THE <span className="text-sith-red text-glow-red">COMMAND</span> CENTER</h2>
                  <p className="text-gray-500 font-orbitron text-xs tracking-[0.3em] uppercase">Ecosystem Overview</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[240px]">
                  {/* Left Column: Tall Feature - Banner */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="md:row-span-2 relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-sith-charcoal/30 p-8 flex flex-col justify-end"
                  >
                    <div className="relative z-10">
                      <p className="font-orbitron text-sith-red text-[10px] font-bold tracking-widest mb-2">CHANNEL ART</p>
                      <h3 className="font-orbitron text-2xl font-black text-white leading-tight">FTXMONK<br/>OFFICIAL</h3>
                    </div>
                    <img 
                      src="input_file_2.png" 
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-1000" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-sith-black via-transparent to-transparent opacity-60" />
                  </motion.div>

                  {/* Top Middle: Small Item 1 - About */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-sith-charcoal/30 p-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-sith-red/20 rounded-xl flex items-center justify-center">
                        <Shield className="text-sith-red" size={20} />
                      </div>
                      <span className="text-[10px] font-orbitron text-gray-500 uppercase">Editor</span>
                    </div>
                    <div className="mt-4">
                      <p className="text-white text-[10px] font-bold leading-tight">Davinci Resolve 18 Expert</p>
                      <p className="text-gray-500 text-[8px] mt-1 line-clamp-2">Neptun style and floby style AMVs & edits.</p>
                    </div>
                  </motion.div>

                  {/* Top Right: Small Item 2 - Subs */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-sith-charcoal/30 p-6 flex items-center justify-center"
                  >
                    <img src="input_file_3.png" className="absolute inset-0 w-full h-full object-cover opacity-10" referrerPolicy="no-referrer" />
                    <div className="text-center relative z-10">
                      <div className="text-4xl font-black text-white font-orbitron mb-1 text-glow-red">361</div>
                      <div className="text-[10px] font-orbitron text-sith-red tracking-widest uppercase">Subscribers</div>
                    </div>
                  </motion.div>

                  {/* Right Column: Tall Feature - Stats */}
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="md:row-span-2 relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-sith-charcoal/30 p-8"
                  >
                    <h3 className="font-orbitron text-lg font-bold text-white mb-6">CHANNEL INFO</h3>
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                          <Youtube className="text-sith-red" size={20} />
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold">137 Videos</p>
                          <p className="text-gray-500 text-[10px] uppercase">Upload Count</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                          <TrendingUp className="text-sith-red" size={20} />
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold">Joined 2022</p>
                          <p className="text-gray-500 text-[10px] uppercase">May 19, 2022</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-gray-400 text-[10px] italic leading-relaxed">"Every video takes a lot of effort so i appreciate a lot if u like my videos!"</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Middle: Large Wide Analytics - Views */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="md:col-span-2 relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-white p-8"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-gray-400 text-[10px] font-orbitron uppercase tracking-widest">Total Channel Views</p>
                        <h3 className="text-4xl font-black text-sith-black font-orbitron">232,218</h3>
                      </div>
                      <div className="flex gap-2">
                        <div className="px-3 py-1 bg-sith-red/10 rounded-full text-sith-red text-[10px] font-bold">GROWTH</div>
                      </div>
                    </div>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="views" stroke="#FF0000" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Bottom Center: Location */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-2 relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-sith-charcoal/30 p-6 flex flex-col justify-center items-center"
                  >
                    <div className="w-12 h-12 bg-sith-red/20 rounded-full flex items-center justify-center mb-3">
                      <MapPin className="text-sith-red" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-orbitron font-bold text-xs tracking-widest">INDIA</p>
                      <p className="text-gray-500 text-[8px] uppercase tracking-widest mt-1">Base of Operations</p>
                    </div>
                  </motion.div>

                  {/* Bottom Right: Website Link */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-2 relative group overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-sith-red/40 to-sith-black p-6 flex flex-col justify-between"
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <ExternalLink className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-white text-[10px] font-bold">ftxmonk.netlify.app</p>
                      <a 
                        href="https://ftxmonk.netlify.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sith-red text-[8px] font-orbitron uppercase tracking-widest hover:underline"
                      >
                        Visit Portfolio
                      </a>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
          </motion.div>
        ) : activeTab === "resources" ? (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen"
          >
            <div className="flex justify-between items-end mb-12">
              <div>
                <h1 className="font-orbitron text-4xl md:text-6xl font-black text-white mb-4">RESOURCES</h1>
                <p className="text-gray-500 font-orbitron text-xs tracking-widest uppercase">Premium assets for creators</p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => setIsAddingResource(true)}
                  className="w-12 h-12 bg-sith-red rounded-full flex items-center justify-center shadow-red-glow hover:scale-110 transition-transform"
                >
                  <Plus className="text-white" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((res) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={res.id}
                  className="bg-sith-charcoal/30 border border-white/5 p-6 rounded-lg hover:border-sith-red/50 transition-colors group relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-1 bg-sith-red/10 text-sith-red text-[10px] font-orbitron font-bold tracking-widest uppercase rounded">
                      {res.category}
                    </span>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteResource(res.id)}
                        className="text-gray-600 hover:text-sith-red transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <h3 className="font-orbitron text-xl font-bold text-white mb-2">{res.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2">{res.description}</p>
                  <a 
                    href={res.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sith-red font-orbitron text-xs tracking-widest font-bold hover:gap-4 transition-all"
                  >
                    DOWNLOAD <ExternalLink size={14} />
                  </a>
                </motion.div>
              ))}
              
              {resources.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-lg">
                  <p className="text-gray-600 font-orbitron text-sm tracking-widest uppercase">No resources available yet.</p>
                </div>
              )}

              {loading && (
                <div className="col-span-full py-20 flex justify-center">
                  <Loader2 className="text-sith-red animate-spin" size={32} />
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === "reviews" ? (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen"
          >
            <div className="flex justify-between items-end mb-12">
              <div>
                <h1 className="font-orbitron text-4xl md:text-6xl font-black text-white mb-4">REVIEWS</h1>
                <p className="text-gray-500 font-orbitron text-xs tracking-widest uppercase">What the community says</p>
              </div>
              {user && (
                <button 
                  onClick={() => setIsAddingReview(true)}
                  className="w-12 h-12 bg-sith-red rounded-full flex items-center justify-center shadow-red-glow hover:scale-110 transition-transform"
                >
                  <MessageSquare className="text-white" size={20} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((rev) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={rev.id}
                  className="bg-sith-charcoal/30 border border-white/5 p-6 rounded-lg hover:border-sith-red/50 transition-colors group relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={14} 
                          className={i < rev.rating ? "text-sith-red fill-sith-red" : "text-gray-700"} 
                        />
                      ))}
                    </div>
                    {(isAdmin || rev.authorUid === user?.uid) && (
                      <button 
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-gray-600 hover:text-sith-red transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm mb-6 italic">"{rev.text}"</p>
                  <div className="flex items-center gap-3">
                    <img src={rev.userPhoto || "https://picsum.photos/seed/user/40/40"} alt={rev.userName} className="w-8 h-8 rounded-full border border-white/10" />
                    <span className="font-orbitron text-[10px] tracking-widest text-gray-500 uppercase">{rev.userName}</span>
                  </div>
                </motion.div>
              ))}
              
              {reviews.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-lg">
                  <p className="text-gray-600 font-orbitron text-sm tracking-widest uppercase">No reviews yet. Be the first!</p>
                </div>
              )}

              {loading && (
                <div className="col-span-full py-20 flex justify-center">
                  <Loader2 className="text-sith-red animate-spin" size={32} />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen"
          >
            <div className="mb-12">
              <h1 className="font-orbitron text-4xl md:text-6xl font-black text-white mb-4">LOGGED USERS</h1>
              <p className="text-gray-500 font-orbitron text-xs tracking-widest uppercase">Admin Monitoring Dashboard</p>
            </div>

            <div className="bg-sith-charcoal/30 border border-white/5 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="p-4 font-orbitron text-[10px] tracking-widest text-gray-400 uppercase">User</th>
                    <th className="p-4 font-orbitron text-[10px] tracking-widest text-gray-400 uppercase">Email</th>
                    <th className="p-4 font-orbitron text-[10px] tracking-widest text-gray-400 uppercase">Role</th>
                    <th className="p-4 font-orbitron text-[10px] tracking-widest text-gray-400 uppercase">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.uid} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL || "https://picsum.photos/seed/user/40/40"} alt={u.displayName} className="w-8 h-8 rounded-full border border-white/10" />
                          <span className="text-sm text-white font-medium">{u.displayName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-400">{u.email}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-orbitron font-bold tracking-widest uppercase px-2 py-1 rounded ${u.role === 'admin' ? 'bg-sith-red/20 text-sith-red' : 'bg-white/10 text-gray-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {u.lastLogin?.toDate().toLocaleString() || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {usersList.length === 0 && !loading && (
                <div className="py-20 text-center">
                  <p className="text-gray-600 font-orbitron text-sm tracking-widest uppercase">No users found.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Review Modal */}
      <AnimatePresence>
        {isAddingReview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingReview(false)}
              className="absolute inset-0 bg-sith-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-sith-charcoal border border-white/10 p-8 rounded-lg shadow-2xl"
            >
              <button 
                onClick={() => setIsAddingReview(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <h2 className="font-orbitron text-2xl font-bold text-white mb-6">POST REVIEW</h2>
              <form onSubmit={handleAddReview} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-orbitron text-gray-500 tracking-widest uppercase mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star 
                          size={24} 
                          className={star <= reviewRating ? "text-sith-red fill-sith-red" : "text-gray-700"} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-orbitron text-gray-500 tracking-widest uppercase mb-2">Your Review</label>
                  <textarea 
                    name="text" 
                    required 
                    placeholder="Tell us what you think..."
                    className="w-full bg-sith-black border border-white/10 rounded px-4 py-2 text-white focus:border-sith-red outline-none transition-colors h-32 resize-none" 
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-sith-red text-white font-orbitron font-bold text-xs tracking-widest rounded shadow-red-glow hover:shadow-red-glow-strong transition-all mt-4">
                  SUBMIT REVIEW
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {isAddingResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingResource(false)}
              className="absolute inset-0 bg-sith-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-sith-charcoal border border-white/10 p-8 rounded-lg shadow-2xl"
            >
              <button 
                onClick={() => setIsAddingResource(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <h2 className="font-orbitron text-2xl font-bold text-white mb-6">ADD RESOURCE</h2>
              <form onSubmit={handleAddResource} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-orbitron text-gray-500 tracking-widest uppercase mb-2">Title</label>
                  <input name="title" required className="w-full bg-sith-black border border-white/10 rounded px-4 py-2 text-white focus:border-sith-red outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-orbitron text-gray-500 tracking-widest uppercase mb-2">Description</label>
                  <textarea name="description" className="w-full bg-sith-black border border-white/10 rounded px-4 py-2 text-white focus:border-sith-red outline-none transition-colors h-24" />
                </div>
                <div>
                  <label className="block text-[10px] font-orbitron text-gray-500 tracking-widest uppercase mb-2">URL</label>
                  <input name="url" type="url" required className="w-full bg-sith-black border border-white/10 rounded px-4 py-2 text-white focus:border-sith-red outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-orbitron text-gray-500 tracking-widest uppercase mb-2">Category</label>
                  <select name="category" className="w-full bg-sith-black border border-white/10 rounded px-4 py-2 text-white focus:border-sith-red outline-none transition-colors">
                    <option value="Preset">Preset</option>
                    <option value="Overlay">Overlay</option>
                    <option value="SFX">SFX</option>
                    <option value="LUT">LUT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-sith-red text-white font-orbitron font-bold text-xs tracking-widest rounded shadow-red-glow hover:shadow-red-glow-strong transition-all mt-4">
                  PUBLISH RESOURCE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-20 bg-sith-charcoal/50 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-orbitron font-black text-2xl tracking-tighter text-glow-red">
            FTXMONK
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex gap-8">
              <a href="#" className="text-gray-500 hover:text-sith-red transition-colors text-xs uppercase tracking-widest font-bold">Instagram</a>
              <a href="#" className="text-gray-500 hover:text-sith-red transition-colors text-xs uppercase tracking-widest font-bold">Twitter</a>
              <a href="#" className="text-gray-500 hover:text-sith-red transition-colors text-xs uppercase tracking-widest font-bold">Discord</a>
            </div>
            <a href="mailto:mayankand1234@gmail.com" className="text-sith-red/60 hover:text-sith-red transition-colors text-[10px] font-orbitron tracking-widest uppercase">
              mayankand1234@gmail.com
            </a>
          </div>
          
          <p className="text-gray-600 text-[10px] uppercase tracking-widest">
            &copy; 2026 FTXMONK. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
