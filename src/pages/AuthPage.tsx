import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isUsingDummyClient } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { migrateGuestDataToNewUser } from "@/services/migrateGuestData";
import { ArrowRight, Sparkles, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if current user is a guest
    const checkGuestStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const guest = user.is_anonymous || !user.email;
        setIsGuest(guest);
        // If guest user, default to sign-up mode
        if (guest) {
          setIsSignUp(true);
        }
      } else {
        setUser(null);
      }
    };
    checkGuestStatus();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const guest = session.user.is_anonymous || !session.user.email;
        setIsGuest(guest);
        if (guest) {
          setIsSignUp(true);
        }
      } else {
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUsingDummyClient) {
      toast({
        title: isSignUp ? "Account created! (Dev mode)" : "Welcome back! (Dev mode)",
        description: "Dev mode: Skipping authentication",
      });
      navigate("/dashboard");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const isCurrentGuest = currentUser?.is_anonymous || 
                               !currentUser?.email;
        // Check both current guest user and stored guest user ID from localStorage
        const storedGuestUserId = localStorage.getItem('nutriscope_guest_user_id');
        const guestUserId = isCurrentGuest ? currentUser?.id : (storedGuestUserId || null);

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (guestUserId && signUpData.user) {
          // Clear stored guest user ID after migration
          localStorage.removeItem('nutriscope_guest_user_id');
          localStorage.removeItem('nutriscope_has_guest_data');
          try {
            // Wait a moment for the new user session to be established
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Migrate guest data with progress tracking
            const migrationResult = await migrateGuestDataToNewUser(
              guestUserId,
              signUpData.user.id,
              (progress) => {
                // Log progress for debugging
                console.log("Migration progress:", progress);
              }
            );

            // Show detailed migration results
            const hasErrors = migrationResult.errors.length > 0;
            const successCount = migrationResult.success ? 1 : 0;

            if (migrationResult.success) {
              toast({
                title: "Account created!",
                description: hasErrors
                  ? `Your account was created and data migrated. Some items may need manual review. Please check your email to verify.`
                  : `All your guest data has been transferred! Please check your email to verify.`,
                variant: hasErrors ? "destructive" : "default",
              });
            } else {
              toast({
                title: "Account created!",
                description: hasErrors
                  ? `Your account was created successfully. Some guest data may not have been transferred. Please check your email to verify.`
                  : `Your account was created. Please check your email to verify your account.`,
                variant: hasErrors ? "destructive" : "default",
              });
            }
          } catch (migrationError) {
            console.error("Error migrating guest data:", migrationError);
            toast({
              title: "Account created!",
              description: "Your account was created successfully. Some guest data may not have been transferred. Please check your email to verify.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast({
        title: isSignUp ? "Sign up failed" : "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    if (isUsingDummyClient) {
      navigate("/dashboard");
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        toast({
          title: "Welcome back!",
          description: "You're already signed in.",
        });
        navigate("/dashboard");
        return;
      }

      const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();

      if (anonymousError) {
        throw anonymousError;
      }

      if (anonymousData.user) {
        toast({
          title: "Welcome, Guest!",
          description: "You're using the app as a guest. Your data will be saved in this browser session.",
        });

        navigate("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Guest access error:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not access as guest. Please enable anonymous authentication in Supabase or sign up with email.";
      toast({
        title: "Guest access failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void relative">
      {/* Background */}
      <div className="fixed top-0 w-full -z-10 h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-void via-acid/5 to-acid/10"></div>
      </div>

      <div className="relative z-20">
        <Header user={user} />
        
        <main className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Copy */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 text-xs text-dim font-mono bg-surface/50 border border-border rounded-full px-3 py-1.5 backdrop-blur-md mb-6" style={{ animation: "fadeSlideIn 1s ease-out 0.1s both" }}>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-acid"></span>
                  {isSignUp ? "Get Started" : "Welcome Back"}
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl leading-[1.1] tracking-tighter font-bold text-text mb-6 font-sans" style={{ animation: "fadeSlideIn 1s ease-out 0.2s both" }}>
                  {isSignUp ? (
                    <>
                      Start your health<br className="hidden sm:block" /> journey
                    </>
                  ) : (
                    <>
                      Continue tracking<br className="hidden sm:block" /> your health
                    </>
                  )}
                </h1>
                
                <p className="text-base sm:text-lg text-dim font-mono mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed" style={{ animation: "fadeSlideIn 1s ease-out 0.3s both" }}>
                  {isSignUp
                    ? "Join thousands tracking their nutrition and fitness goals with AI-powered insights."
                    : "Sign in to access your dashboard, meal logs, and personalized health insights."}
                </p>

                {/* Features */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center lg:justify-start mb-8" style={{ animation: "fadeSlideIn 1s ease-out 0.4s both" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex w-9 h-9 bg-surface/50 border border-border rounded-sm items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-acid" />
                    </div>
                    <span className="text-sm font-bold text-text font-mono uppercase">AI-Powered</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex w-9 h-9 bg-surface/50 border border-border rounded-sm items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-sm font-bold text-text font-mono uppercase">Smart Tracking</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex w-9 h-9 bg-surface/50 border border-border rounded-sm items-center justify-center flex-shrink-0">
                      <ShieldCheck className="h-4 w-4 text-acid" />
                    </div>
                    <span className="text-sm font-bold text-text font-mono uppercase">Secure & Private</span>
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div className="relative" style={{ animation: "fadeSlideIn 1s ease-out 0.5s both" }}>
                {/* Background glow */}
                <div className="absolute -inset-6 sm:-inset-10 pointer-events-none">
                  <div className="absolute right-6 sm:right-10 top-0 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-acid/20 blur-3xl"></div>
                  <div className="absolute left-2 sm:left-5 top-12 sm:top-20 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-success/20 blur-3xl"></div>
                  <div className="absolute right-0 bottom-6 sm:bottom-10 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-accent/20 blur-3xl"></div>
                </div>

                {/* Form Card */}
                <div className="relative z-10 card-modern p-8 sm:p-10">
                  <div className="mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-2 font-sans">
                      {isSignUp ? "Create Account" : "Sign In"}
                    </h2>
                    <p className="text-sm text-dim font-mono leading-relaxed">
                      {isSignUp
                        ? isGuest
                          ? "Convert your guest account to keep all your data"
                          : "Start tracking your health today"
                        : "Sign in to continue your health journey"}
                    </p>
                    {isGuest && isSignUp && (
                      <div className="mt-4 p-4 card-modern border-acid/30">
                        <p className="text-sm text-text font-mono leading-relaxed flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-acid flex-shrink-0 mt-0.5" />
                          <span><strong className="text-acid">Good news!</strong> All your meals, workouts, and chat history will be automatically transferred to your new account.</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-dim mb-2 block">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-dim mb-2 block">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="input-modern"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn-primary w-full inline-flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed" 
                      disabled={loading}
                    >
                      <span>{loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}</span>
                      {!loading && (
                        <div className="relative flex items-center justify-center w-5 h-5 bg-void/20 rounded-full group-hover:bg-void/30 transition-all">
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      )}
                    </button>
                  </form>

                  {!isGuest && (
                    <div className="mt-6 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-surface px-3 text-dim font-mono uppercase">
                            Or
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleGuest}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Continue as Guest"}
                      </button>
                      <p className="text-xs text-center text-dim font-mono">
                        No email needed! Your data will be saved in this browser session
                      </p>
                    </div>
                  )}

                  <p className="mt-6 text-center text-sm text-dim font-mono">
                    {isSignUp ? (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(false)}
                          className="text-acid hover:opacity-80 transition-colors font-bold"
                        >
                          Sign in
                        </button>
                      </>
                    ) : (
                      <>
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(true)}
                          className="text-acid hover:opacity-80 transition-colors font-bold"
                        >
                          Sign up
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
