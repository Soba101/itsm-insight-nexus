import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthBrandHeader } from "@/components/AuthBrandHeader";

type FieldName = "email";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<FieldName, string | undefined>>({ email: undefined });

  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const successAlertRef = useRef<HTMLDivElement | null>(null);
  const successDescriptionId = useMemo(() => "forgot-success-description", []);

  useEffect(() => {
    if (error && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess && successAlertRef.current) {
      successAlertRef.current.focus();
    }
  }, [isSuccess]);

  const validateField = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Email is required.";
    const emailPattern = /.+@.+\..+/;
    if (!emailPattern.test(trimmed)) return "Enter a valid business email.";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailError = validateField(email);
    setFieldErrors({ email: emailError });
    if (emailError) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(email.trim());

      if (error) {
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-border/60 shadow-xl">
          <AuthBrandHeader
            icon={<CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
            title="Check your email"
            description={`We've sent a password reset link to ${email}`}
            tone="success"
          />
          <CardContent className="space-y-4">
            <Alert ref={successAlertRef} tabIndex={-1} aria-live="polite">
              <AlertDescription id={successDescriptionId}>
                Click the link in the email to reset your password. The link expires in 1 hour.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <AuthBrandHeader
          icon={<Mail className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="Forgot password?"
          description="Enter your email and we'll send you a reset link"
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
                  onBlur={() => setFieldErrors({ email: validateField(email) })}
                  className="pl-10"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </div>
              {!fieldErrors.email && (
                <p className="text-xs text-muted-foreground">
                  We'll send instructions to this address.
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
