
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  console.log('AuthPage.tsx - AuthPage component rendering');
  const { signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  
  console.log('AuthPage.tsx - loading:', loading);

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!signInData.email || !signInData.password) {
      setAuthError('Please fill in all fields');
      return;
    }

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      
      if (error) {
        console.error('Sign in failed:', error);
        let errorMessage = 'Sign in failed';
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Too many attempts. Please wait before trying again';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setAuthError(errorMessage);
        toast({
          title: "Sign in failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Sign in exception:', error);
      setAuthError('An unexpected error occurred');
      toast({
        title: "Sign in failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!signUpData.email || !signUpData.password || !signUpData.fullName) {
      setAuthError('Please fill in all fields');
      return;
    }

    if (signUpData.password.length < 6) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);
      
      if (error) {
        console.error('Sign up failed:', error);
        let errorMessage = 'Sign up failed';
        
        if (error.message?.includes('already registered')) {
          errorMessage = 'An account with this email already exists';
        } else if (error.message?.includes('Password should be')) {
          errorMessage = 'Password is too weak. Please use a stronger password';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setAuthError(errorMessage);
        toast({
          title: "Sign up failed",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign up successful",
          description: "Please check your email to confirm your account."
        });
        // Clear form after successful signup
        setSignUpData({ email: '', password: '', fullName: '' });
      }
    } catch (error) {
      console.error('Sign up exception:', error);
      setAuthError('An unexpected error occurred');
      toast({
        title: "Sign up failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/placeholder.svg" 
              alt="SoundScribe Logo" 
              className="h-12 w-12"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SoundScribe
            </h1>
          </div>
          <p className="text-gray-600">AI-powered audio transcription and analysis</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="signin" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="Choose a password (min 6 characters)"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>

                <Alert className="mt-4 border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    The first user to register will automatically receive admin privileges.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Having trouble? Check your email for confirmation or try refreshing the page.</p>
        </div>
      </div>
    </div>
  );
}
