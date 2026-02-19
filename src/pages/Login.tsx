import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import schoolLogo from "@/assets/school-logo.png";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! You can now sign in.");
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={schoolLogo} alt="Acacia Country School" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold font-display text-foreground">Fee Tracking System</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Create your account" : "Sign in to manage school fees"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acaciaschool.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acacia Country School — Day & Boarding
        </p>
      </div>
    </div>
  );
}
