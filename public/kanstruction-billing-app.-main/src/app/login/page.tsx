
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  ConfirmationResult,
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { KanstructionLogo } from '@/components/icons';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuthError = (error: any) => {
    setIsSubmitting(false); // Always reset submitting state on error
    let title = 'Authentication Failed';
    let description = 'An unexpected error occurred. Please try again.';

    switch (error.code) {
      case 'auth/user-not-found':
        title = 'User Not Found';
        description = 'No account found with this email. Please sign up.';
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        title = 'Incorrect Email or Password';
        description = 'The email or password you entered is incorrect. Please try again.';
        break;
      case 'auth/email-already-in-use':
        title = 'Email In Use';
        description = 'This email is already associated with an account. Please log in.';
        break;
      case 'auth/weak-password':
        title = 'Weak Password';
        description = 'The password must be at least 6 characters long.';
        break;
      case 'auth/invalid-email':
          title = 'Invalid Email';
          description = 'Please enter a valid email address.';
          break;
      case 'auth/popup-closed-by-user':
          title = 'Sign-in Cancelled';
          description = 'The sign-in window was closed before completion.';
          break;
      case 'auth/operation-not-allowed':
          title = 'Sign-in Method Disabled';
          description = 'This sign-in method is not enabled. Please enable it in your Firebase Console authentication settings.';
          break;
      case 'auth/invalid-phone-number':
          title = 'Invalid Phone Number';
          description = 'The phone number is not valid. Please check and try again.';
          break;
      case 'auth/missing-phone-number':
          title = 'Missing Phone Number';
          description = 'Please enter a phone number.';
          break;
      case 'auth/captcha-check-failed':
          title = 'reCAPTCHA Failed';
          description = 'The reCAPTCHA verification failed. Please try again.';
          break;
      case 'auth/argument-error':
          title = 'Configuration Error';
          description = 'reCAPTCHA is misconfigured. Please check your Firebase project settings and ensure your domain is whitelisted.';
          break;
      case 'auth/too-many-requests':
          title = 'Too Many Requests';
          description = 'You have tried to sign in too many times. Please wait a while before trying again.';
          break;
      default:
        console.error('Firebase Auth Error:', error);
    }
    
    setIsSubmitting(false);
    
    // Only show a toast if the error is not a user cancellation
    if (error.code !== 'auth/popup-closed-by-user') {
      toast({
        variant: 'destructive',
        title: title,
        description: description,
      });
    }
  };
  
  const setupRecaptcha = () => {
    if (!auth) return null;
    
    // Destroy previous instance if it exists to avoid conflicts
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
    }
    
    try {
        // IMPORTANT: Disabling app verification for non-production environments
        // is a standard practice to bypass domain verification issues during development.
        if (process.env.NODE_ENV !== 'production') {
            (auth.settings as any).appVerificationDisabledForTesting = true;
        }

        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => { /* reCAPTCHA solved */ },
            'expired-callback': () => {
                toast({
                    variant: 'destructive',
                    title: 'reCAPTCHA Expired',
                    description: 'Please try sending the OTP again.',
                });
            }
        });
        return verifier;
    } catch (e: any) {
        handleAuthError(e);
        return null;
    }
  }


  const handleSendOtp = async () => {
    if (!phone) {
        toast({ variant: 'destructive', title: 'Phone number required', description: 'Please enter a 10-digit phone number.'});
        return;
    }
    setIsSubmitting(true);
    
    const verifier = setupRecaptcha();
    if (!verifier) {
      setIsSubmitting(false);
      return;
    }
    
    const fullPhoneNumber = `+91${phone}`;
    try {
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
      window.recaptchaVerifier = verifier;
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${fullPhoneNumber}`});
    } catch (error: any) {
      handleAuthError(error);
      // Reset reCAPTCHA on error
      if (verifier) {
          verifier.clear();
      }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
        toast({ variant: 'destructive', title: 'OTP required', description: 'Please enter the 6-digit OTP.'});
        return;
    }
    if (!confirmationResult) {
        handleAuthError({ code: 'auth/no-confirmation-result', message: 'No confirmation result found. Please send the OTP again.' });
        return;
    }
    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(otp);
      toast({ title: 'Logged In!', description: 'You have successfully signed in with your phone number.' });
      setIsPhoneModalOpen(false);
      // isSubmitting will be reset by the page navigation or an error
    } catch (error: any) {
      handleAuthError(error);
    }
  };


  const handleSignUp = async () => {
    setIsSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Account Created!',
        description: "You've been successfully signed up.",
      });
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const handleLogIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Logged In!',
        description: "Welcome back.",
      });
    } catch (error: any) {
      handleAuthError(error);
    }
  };
  
  const handleAnonymousSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInAnonymously(auth);
      toast({
          title: 'Guest Session Started',
          description: "You're logged in as a guest.",
      });
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Logged In!', description: 'Welcome!' });
    } catch (error: any) {
       handleAuthError(error);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div id="recaptcha-container"></div>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="flex items-center gap-4 mb-8">
          <KanstructionLogo className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Kanstruction Billing
          </h1>
        </div>
        <Tabs defaultValue="login" className="w-full max-w-sm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Access your saved invoices and settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button onClick={handleLogIn} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>
                  Create an account to save your invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSignUp} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing up...' : 'Create Account'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="relative my-4 w-full max-w-sm">
          <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-2">
          <Button variant="outline" onClick={handleGoogleSignIn} className="w-full" disabled={isSubmitting}>
            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.66 1.67-3.86 0-6.99-3.16-6.99-7.02s3.13-7.02 6.99-7.02c2.2 0 3.28.85 4.05 1.58l2.84-2.78C18.14 2.14 15.47 1 12.48 1 7.02 1 3 5.02 3 9.5s4.02 8.5 9.48 8.5c2.9 0 5.16-1 6.83-2.62 1.76-1.7 2.44-4.04 2.44-6.2v-.22h-9.28z"></path></svg>
            {isSubmitting ? 'Loading...' : 'Sign in with Google'}
          </Button>
           <Button variant="outline" onClick={() => setIsPhoneModalOpen(true)} className="w-full" disabled={isSubmitting}>
            Sign in with Phone
          </Button>
          <Button variant="outline" onClick={handleAnonymousSignIn} className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Loading...' : 'Continue as Guest'}
          </Button>
        </div>
      </div>
      <Dialog open={isPhoneModalOpen} onOpenChange={setIsPhoneModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in with Phone</DialogTitle>
            <DialogDescription>
              {isOtpSent ? 'Enter the 6-digit OTP we sent to your phone.' : 'Please enter your 10-digit phone number to receive an OTP.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!isOtpSent ? (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                    <span className="p-2 bg-gray-100 border rounded-md">+91</span>
                    <Input id="phone" type="tel" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} maxLength={10} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input id="otp" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isSubmitting} maxLength={6} />
              </div>
            )}
          </div>
          <DialogFooter>
            {!isOtpSent ? (
              <Button onClick={handleSendOtp} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            ) : (
              <Button onClick={handleVerifyOtp} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    