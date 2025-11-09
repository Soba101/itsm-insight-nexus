import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, User, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthBrandHeader } from "@/components/AuthBrandHeader";

type FieldName = "fullName" | "email" | "password" | "confirmPassword";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<FieldName, string | undefined>>({
    fullName: undefined,
    email: undefined,
    password: undefined,
    confirmPassword: undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState({ password: false, confirmPassword: false });

  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const passwordStrengthId = useMemo(() => "signup-password-strength", []);
  const capsPasswordId = useMemo(() => "signup-password-caps", []);
  const capsConfirmId = useMemo(() => "signup-confirm-caps", []);

  useEffect(() => {
    if (error && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [error]);

  const validateField = (field: FieldName, value: string) => {
    const trimmed = value.trim();

    switch (field) {
      case "fullName":
        if (!trimmed) return "Full name is required.";
        if (!trimmed.includes(" ")) return "Include first and last name.";
        return undefined;
      case "email": {
        if (!trimmed) return "Email is required.";
        const emailPattern = /.+@.+\..+/;
        if (!emailPattern.test(trimmed)) return "Enter a valid business email.";
        return undefined;
      }
      case "password": {
        if (!trimmed) return "Password is required.";
        if (trimmed.length < 8) return "Use at least 8 characters.";
        if (!/[0-9]/.test(trimmed)) return "Include at least one number.";
        if (!/[A-Z]/.test(trimmed)) return "Add one uppercase letter.";
        return undefined;
      }
      case "confirmPassword": {
        if (!trimmed) return "Please confirm your password.";
        if (trimmed !== password) return "Passwords must match.";
        return undefined;
      }
      default:
        return undefined;
    }
  };

  const runValidation = () => {
    const nextErrors = {
      fullName: validateField("fullName", fullName),
      email: validateField("email", email),
      password: validateField("password", password),
      confirmPassword: validateField("confirmPassword", confirmPassword),
    };

    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const calculatePasswordStrength = (value: string) => {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (!value) return { label: "", tone: "text-muted-foreground" } as const;
    if (score <= 1) return { label: "Weak", tone: "text-destructive" } as const;
    if (score === 2 || score === 3) return { label: "Moderate", tone: "text-amber-600" } as const;
    return { label: "Strong", tone: "text-emerald-600" } as const;
  };

  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!runValidation()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
      });

      if (error) {
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
        navigate("/login");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapsLock = (field: "password" | "confirmPassword") => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === "function") {
      setCapsLockOn((prev) => ({ ...prev, [field]: event.getModifierState("CapsLock") }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <AuthBrandHeader
          icon={<User className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="Create an account"
          description="Get started with ITSM Insight Nexus"
        />
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-6">
            {error && (
              <Alert ref={errorAlertRef} tabIndex={-1} variant="destructive" className="border-destructive" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center justify-between text-sm font-medium">
                Full name
                {fieldErrors.fullName && (
                  <span className="text-xs font-normal text-destructive">{fieldErrors.fullName}</span>
                )}
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jordan Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, fullName: validateField("fullName", fullName) }))}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center justify-between text-sm font-medium">
                Work email
                {fieldErrors.email && (
                  <span className="text-xs font-normal text-destructive">{fieldErrors.email}</span>
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center justify-between text-sm font-medium">
                Password
                {passwordStrength.label && (
                  <span id={passwordStrengthId} className={`text-xs font-medium ${passwordStrength.tone}`}>
                    Strength: {passwordStrength.label}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, password: validateField("password", password) }))}
                  onKeyUp={handleCapsLock("password")}
                  onKeyDown={handleCapsLock("password")}
                  className="pl-10 pr-12"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={[fieldErrors.password ? undefined : passwordStrengthId, capsLockOn.password ? capsPasswordId : undefined]
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
              {fieldErrors.password && (
                <p className="text-xs text-destructive" role="alert">
                  {fieldErrors.password}
                </p>
              )}
              {capsLockOn.password && (
                <p id={capsPasswordId} className="flex items-center gap-2 text-xs text-amber-600" role="status" aria-live="assertive">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Caps Lock is on.
                </p>
              )}
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                <li>• At least 8 characters</li>
                <li>• Include one uppercase letter and one number</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center justify-between text-sm font-medium">
                Confirm password
                {fieldErrors.confirmPassword && (
                  <span className="text-xs font-normal text-destructive">{fieldErrors.confirmPassword}</span>
                )}
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, confirmPassword: validateField("confirmPassword", confirmPassword) }))}
                  onKeyUp={handleCapsLock("confirmPassword")}
                  onKeyDown={handleCapsLock("confirmPassword")}
                  className="pl-10 pr-12"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}
              {capsLockOn.confirmPassword && (
                <p id={capsConfirmId} className="flex items-center gap-2 text-xs text-amber-600" role="status" aria-live="assertive">
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
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </Button>

            <div className="space-y-3 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Enterprise SSO (Azure AD, Okta) available via admin request.
              </div>
              <div>
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="text-sm text-center text-muted-foreground">
              Need enterprise onboarding? <a href="mailto:support@itsminsight.local" className="text-primary hover:underline">Contact IT admin</a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
