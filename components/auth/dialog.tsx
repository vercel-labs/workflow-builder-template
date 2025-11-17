"use client";

import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, useSession } from "@/lib/auth-client";

type AuthDialogProps = {
  defaultMode?: "signin" | "signup";
  children?: ReactNode;
};

export const AuthDialog = ({
  defaultMode = "signin",
  children,
}: AuthDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const getDialogDescription = () => {
    if (mode === "signin") {
      return "Sign in to your account to continue";
    }
    if (session?.user) {
      return "Create an account to save your work permanently";
    }
    return "Create a new account to get started";
  };

  const getButtonText = () => {
    if (loading) {
      return "Loading...";
    }
    return mode === "signin" ? "Sign In" : "Sign Up";
  };

  const handleSignUp = async () => {
    const signUpResponse = await signUp.email({
      email,
      password,
      name,
    });
    if (signUpResponse.error) {
      setError(signUpResponse.error.message || "Sign up failed");
      return false;
    }

    // Automatically sign in after successful sign-up
    const signInResponse = await signIn.email({
      email,
      password,
    });
    if (signInResponse.error) {
      setError(signInResponse.error.message || "Sign in failed");
      return false;
    }

    toast.success("Account created and signed in successfully!");
    return true;
  };

  const handleSignIn = async () => {
    const response = await signIn.email({
      email,
      password,
    });
    if (response.error) {
      setError(response.error.message || "Sign in failed");
      return false;
    }

    toast.success("Signed in successfully!");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success =
        mode === "signup" ? await handleSignUp() : await handleSignIn();
      if (success) {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="default">
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "signin" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                type="text"
                value={name}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              type="password"
              value={password}
            />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <Button className="w-full" disabled={loading} type="submit">
            {getButtonText()}
          </Button>
        </form>

        <div className="flex justify-center">
          <button
            className="text-muted-foreground text-sm hover:text-foreground"
            onClick={toggleMode}
            type="button"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
