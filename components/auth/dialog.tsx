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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { signIn, signUp } from "@/lib/auth-client";
import {
  getEnabledAuthProviders,
  getSingleProvider,
} from "@/lib/auth-providers";

type AuthDialogProps = {
  children?: ReactNode;
};

const VercelIcon = ({ className = "mr-2 h-3 w-3" }: { className?: string }) => (
  <svg
    aria-label="Vercel"
    className={className}
    fill="currentColor"
    role="img"
    viewBox="0 0 76 65"
  >
    <title>Vercel</title>
    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
  </svg>
);

const GitHubIcon = () => (
  <svg
    aria-label="GitHub"
    className="mr-2 h-4 w-4"
    fill="currentColor"
    role="img"
    viewBox="0 0 24 24"
  >
    <title>GitHub</title>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const GoogleIcon = () => (
  <svg
    aria-label="Google"
    className="mr-2 h-4 w-4"
    role="img"
    viewBox="0 0 24 24"
  >
    <title>Google</title>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="currentColor"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="currentColor"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="currentColor"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="currentColor"
    />
  </svg>
);

const EmailIcon = () => (
  <svg
    aria-label="Email"
    className="mr-2 h-4 w-4"
    fill="none"
    role="img"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <title>Email</title>
    <path
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

type Provider = "email" | "github" | "google" | "vercel";

const getProviderIcon = (provider: Provider, compact = false) => {
  const iconClass = compact ? "size-3.5" : undefined;
  switch (provider) {
    case "vercel":
      return <VercelIcon className={iconClass} />;
    case "github":
      return <GitHubIcon />;
    case "google":
      return <GoogleIcon />;
    case "email":
      return <EmailIcon />;
    default:
      return <EmailIcon />;
  }
};

const getProviderLabel = (provider: Provider) => {
  switch (provider) {
    case "vercel":
      return "Vercel";
    case "github":
      return "GitHub";
    case "google":
      return "Google";
    case "email":
      return "Email";
    default:
      return "Email";
  }
};

const getButtonText = (loading: boolean, mode: "signin" | "signup") => {
  if (loading) {
    return "Loading...";
  }
  return mode === "signup" ? "Sign Up" : "Sign In";
};

type EmailFormProps = {
  mode: "signin" | "signup";
  name: string;
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
};

const EmailForm = ({
  mode,
  name,
  email,
  password,
  error,
  loading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: EmailFormProps) => (
  <div className="space-y-4">
    <form className="space-y-4" onSubmit={onSubmit}>
      {mode === "signup" && (
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="name">
            Name
          </Label>
          <Input
            id="name"
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="John Doe"
            required
            type="text"
            value={name}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="email">
          Email
        </Label>
        <Input
          id="email"
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="password">
          Password
        </Label>
        <Input
          id="password"
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          required
          type="password"
          value={password}
        />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <Button className="w-full" disabled={loading} type="submit">
        {getButtonText(loading, mode)}
      </Button>
    </form>

    <div className="flex justify-center">
      <button
        className="text-muted-foreground text-sm hover:text-foreground"
        onClick={onToggleMode}
        type="button"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  </div>
);

type SocialButtonsProps = {
  enabledProviders: {
    vercel: boolean;
    github: boolean;
    google: boolean;
  };
  onSignIn: (provider: "github" | "google" | "vercel") => void;
  loadingProvider: "github" | "google" | "vercel" | null;
};

const SocialButtons = ({
  enabledProviders,
  onSignIn,
  loadingProvider,
}: SocialButtonsProps) => (
  <div className="flex flex-col gap-2">
    {enabledProviders.vercel && (
      <Button
        className="w-full"
        disabled={loadingProvider !== null}
        onClick={() => onSignIn("vercel")}
        type="button"
        variant="outline"
      >
        <VercelIcon />
        {loadingProvider === "vercel" ? "Loading..." : "Sign In with Vercel"}
      </Button>
    )}
    {enabledProviders.github && (
      <Button
        className="w-full"
        disabled={loadingProvider !== null}
        onClick={() => onSignIn("github")}
        type="button"
        variant="outline"
      >
        <GitHubIcon />
        {loadingProvider === "github" ? "Loading..." : "Sign In with GitHub"}
      </Button>
    )}
    {enabledProviders.google && (
      <Button
        className="w-full"
        disabled={loadingProvider !== null}
        onClick={() => onSignIn("google")}
        type="button"
        variant="outline"
      >
        <GoogleIcon />
        {loadingProvider === "google" ? "Loading..." : "Sign In with Google"}
      </Button>
    )}
  </div>
);

type UseAuthHandlers = {
  handleSocialSignIn: (
    provider: "github" | "google" | "vercel"
  ) => Promise<void>;
  handleEmailAuth: (e: React.FormEvent) => Promise<void>;
  toggleMode: () => void;
};

type AuthHandlersOptions = {
  mode: "signin" | "signup";
  setMode: (newMode: "signin" | "signup") => void;
  email: string;
  password: string;
  name: string;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  setLoadingProvider: (provider: "github" | "google" | "vercel" | null) => void;
  setOpen: (open: boolean) => void;
};

const useAuthHandlers = (options: AuthHandlersOptions): UseAuthHandlers => {
  const {
    mode,
    setMode,
    email,
    password,
    name,
    setError,
    setLoading,
    setLoadingProvider,
    setOpen,
  } = options;

  const handleSocialSignIn = async (
    provider: "github" | "google" | "vercel"
  ) => {
    try {
      setLoadingProvider(provider);
      await signIn.social({ provider, callbackURL: "/" });
    } catch {
      toast.error(`Failed to sign in with ${getProviderLabel(provider)}`);
      setLoadingProvider(null);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
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

  const handleEmailAuth = async (e: React.FormEvent) => {
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

  return {
    handleSocialSignIn,
    handleEmailAuth,
    toggleMode,
  };
};

type SingleProviderButtonProps = {
  provider: Provider;
  loadingProvider: "github" | "google" | "vercel" | null;
  onSignIn: (provider: "github" | "google" | "vercel") => Promise<void>;
};

const SingleProviderButton = ({
  provider,
  loadingProvider,
  onSignIn,
}: SingleProviderButtonProps) => {
  const isLoading = loadingProvider === provider;
  return (
    <Button
      className="h-9 gap-1.5 px-2 sm:px-3"
      disabled={loadingProvider !== null}
      onClick={() => onSignIn(provider as "github" | "google" | "vercel")}
      size="sm"
      variant="default"
    >
      {isLoading ? (
        <Spinner className="size-3.5" />
      ) : (
        getProviderIcon(provider, true)
      )}
      <span className="text-sm">Sign In</span>
    </Button>
  );
};

type EmailOnlyDialogProps = {
  children: ReactNode;
  open: boolean;
  mode: "signin" | "signup";
  name: string;
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
};

const EmailOnlyDialog = ({
  children,
  open,
  mode,
  name,
  email,
  password,
  error,
  loading,
  onOpenChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: EmailOnlyDialogProps) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
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
        <DialogDescription>
          {mode === "signin"
            ? "Sign in to your account to continue"
            : "Create a new account to get started"}
        </DialogDescription>
      </DialogHeader>

      <EmailForm
        email={email}
        error={error}
        loading={loading}
        mode={mode}
        name={name}
        onEmailChange={onEmailChange}
        onNameChange={onNameChange}
        onPasswordChange={onPasswordChange}
        onSubmit={onSubmit}
        onToggleMode={onToggleMode}
        password={password}
      />
    </DialogContent>
  </Dialog>
);

type MultiProviderDialogProps = EmailOnlyDialogProps & {
  enabledProviders: {
    vercel: boolean;
    github: boolean;
    google: boolean;
    email: boolean;
  };
  loadingProvider: "github" | "google" | "vercel" | null;
  onSignIn: (provider: "github" | "google" | "vercel") => Promise<void>;
};

const MultiProviderDialog = ({
  children,
  open,
  mode,
  name,
  email,
  password,
  error,
  loading,
  enabledProviders,
  loadingProvider,
  onOpenChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
  onSignIn,
}: MultiProviderDialogProps) => {
  const hasSocialProviders =
    enabledProviders.vercel ||
    enabledProviders.github ||
    enabledProviders.google;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
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
          <DialogDescription>
            {mode === "signin"
              ? "Choose how you want to sign in to continue"
              : "Create a new account to get started"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasSocialProviders && (
            <SocialButtons
              enabledProviders={enabledProviders}
              loadingProvider={loadingProvider}
              onSignIn={onSignIn}
            />
          )}

          {enabledProviders.email && hasSocialProviders && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or Sign In with email
                </span>
              </div>
            </div>
          )}

          {enabledProviders.email && (
            <EmailForm
              email={email}
              error={error}
              loading={loading}
              mode={mode}
              name={name}
              onEmailChange={onEmailChange}
              onNameChange={onNameChange}
              onPasswordChange={onPasswordChange}
              onSubmit={onSubmit}
              onToggleMode={onToggleMode}
              password={password}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AuthDialog = ({ children }: AuthDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    "github" | "google" | "vercel" | null
  >(null);

  const enabledProviders = getEnabledAuthProviders();
  const singleProvider = getSingleProvider();

  const { handleSocialSignIn, handleEmailAuth, toggleMode } = useAuthHandlers({
    mode,
    setMode,
    email,
    password,
    name,
    setError,
    setLoading,
    setLoadingProvider,
    setOpen,
  });

  if (singleProvider && singleProvider !== "email") {
    return (
      <SingleProviderButton
        loadingProvider={loadingProvider}
        onSignIn={handleSocialSignIn}
        provider={singleProvider}
      />
    );
  }

  if (singleProvider === "email") {
    return (
      <EmailOnlyDialog
        email={email}
        error={error}
        loading={loading}
        mode={mode}
        name={name}
        onEmailChange={setEmail}
        onNameChange={setName}
        onOpenChange={setOpen}
        onPasswordChange={setPassword}
        onSubmit={handleEmailAuth}
        onToggleMode={toggleMode}
        open={open}
        password={password}
      >
        {children}
      </EmailOnlyDialog>
    );
  }

  return (
    <MultiProviderDialog
      email={email}
      enabledProviders={enabledProviders}
      error={error}
      loading={loading}
      loadingProvider={loadingProvider}
      mode={mode}
      name={name}
      onEmailChange={setEmail}
      onNameChange={setName}
      onOpenChange={setOpen}
      onPasswordChange={setPassword}
      onSignIn={handleSocialSignIn}
      onSubmit={handleEmailAuth}
      onToggleMode={toggleMode}
      open={open}
      password={password}
    >
      {children}
    </MultiProviderDialog>
  );
};
