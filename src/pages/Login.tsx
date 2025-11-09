import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthBrandHeader } from "@/components/AuthBrandHeader";

type FieldName = "email" | "password";
type LocationState = {
  from?: {
    pathname: string;
  };
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<FieldName, string | undefined>>({
    email: undefined,
    password: undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const emailHelperId = useMemo(() => "login-email-helper", []);
  const emailErrorId = useMemo(() => "login-email-error", []);
  const passwordRequirementsId = useMemo(() => "login-password-requirements", []);
  const passwordErrorId = useMemo(() => "login-password-error", []);
  const capsLockHintId = useMemo(() => "login-password-capslock", []);

  const locationState = (location.state as LocationState | null) ?? null;
  const from = locationState?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    if (error && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [error]);

  const validateField = (field: FieldName, value: string) => {
    const trimmed = value.trim();

    if (field === "email") {
      if (!trimmed) return "Email is required.";
      const emailPattern = /.+@.+\..+/;
      if (!emailPattern.test(trimmed)) return "Enter a valid business email address.";
      return undefined;
    }

    if (!trimmed) return "Password is required.";
    if (trimmed.length < 8) return "Password must be at least 8 characters.";
    if (!/[0-9]/.test(trimmed)) return "Include at least one number.";
    return undefined;
  };

  const runValidation = () => {
    const emailError = validateField("email", email);
    const passwordError = validateField("password", password);
    setFieldErrors({ email: emailError, password: passwordError });
    return !emailError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isValid = runValidation();
    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === "function") {
      setCapsLockOn(event.getModifierState("CapsLock"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <AuthBrandHeader
          icon={<Lock className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="Welcome back"
          description="Sign in to your ITSM Insight Nexus account"
        />
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-6">
            {error && (
              <Alert ref={errorAlertRef} tabIndex={-1} variant="destructive" className="border-destructive" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center justify-between text-sm font-medium">
                Email
                {fieldErrors.email && (
                  <span id={emailErrorId} className="text-xs font-normal text-destructive">
                    {fieldErrors.email}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, email: validateField("email", email) }))}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? emailErrorId : emailHelperId}
                />
              </div>
              {!fieldErrors.email && (
                <p id={emailHelperId} className="text-xs text-muted-foreground">
                  Use your corporate email to access the portal.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, password: validateField("password", password) }))}
                  onKeyUp={handlePasswordKey}
                  onKeyDown={handlePasswordKey}
                  className="pl-10 pr-12"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={[
                    fieldErrors.password ? passwordErrorId : passwordRequirementsId,
                    capsLockOn ? capsLockHintId : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id={passwordErrorId} className="text-xs text-destructive" role="alert">
                  {fieldErrors.password}
                </p>
              ) : (
                <p id={passwordRequirementsId} className="text-xs text-muted-foreground">
                  Password must be at least 8 characters and include a number.
                </p>
              )}
              {capsLockOn && (
                <p id={capsLockHintId} className="flex items-center gap-2 text-xs text-amber-600" role="status" aria-live="assertive">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Caps Lock is on.
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <div className="space-y-3 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Single Sign-On options coming soon (Azure AD, Okta).
              </div>
              <div>
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </div>

            <div className="text-sm text-center text-muted-foreground">
              Need enterprise access? <a href="mailto:support@itsminsight.local" className="text-primary hover:underline">Contact IT admin</a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
