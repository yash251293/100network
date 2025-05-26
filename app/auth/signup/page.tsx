"use client"

import type React from "react"
import { useRouter } from "next/navigation" // Added for redirection
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Check, X } from "lucide-react"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!")
      setIsLoading(false)
      return
    }

    // TODO: Add signup logic here
    // console.log("Signup attempt:", formData)

    // Simulate API call
    // setTimeout(() => {
    //   setIsLoading(false)
    // }, 1000)

    const name = `${formData.firstName} ${formData.lastName}`;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: name,
          password: formData.password,
        }),
      });

      const signupResult = await response.json();

      if (response.ok) {
        console.log('Signup successful:', signupResult);
        // Now attempt to auto-login
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email, // Use email from form
              password: formData.password, // Use password from form
            }),
          });

          const loginResult = await loginResponse.json();

          if (loginResponse.ok) {
            alert('Signup and login successful!');
            console.log('Auto-login successful:', loginResult);
            // Placeholder for session management: store loginResult.user or loginResult.token
            router.push('/feed'); // Redirect to feed
          } else {
            // Auto-login failed
            alert(`Signup successful, but auto-login failed: ${loginResult.message || 'Please login manually.'}`);
            console.error('Auto-login error:', loginResult);
            router.push('/auth/login'); // Redirect to login page
          }
        } catch (loginError) {
          alert('Signup successful, but an error occurred during auto-login. Please try logging in manually.');
          console.error('Unexpected auto-login error:', loginError);
          router.push('/auth/login'); // Redirect to login page
        }
      } else {
        // Signup failed
        alert(`Signup failed: ${signupResult.message || 'Unknown error'}`);
        console.error('Signup error:', signupResult);
      }
    } catch (signupError) {
      alert('An unexpected error occurred during signup. Please try again.');
      console.error('Unexpected signup error:', signupError);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Password validation
    if (name === "password") {
      setPasswordValidation({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /\d/.test(value),
      })
    }
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/100N%20logo-hXZbA69LLfyoIxuGBxaKL2lq5TY9q7.png"
              alt="100N"
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Join 100N to connect with professionals worldwide</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {formData.password && (
                <div className="text-xs space-y-1 mt-2">
                  <div className={`flex items-center ${passwordValidation.length ? "text-green-600" : "text-red-600"}`}>
                    {passwordValidation.length ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center ${passwordValidation.uppercase ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.uppercase ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center ${passwordValidation.lowercase ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.lowercase ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center ${passwordValidation.number ? "text-green-600" : "text-red-600"}`}>
                    {passwordValidation.number ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    One number
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600">Passwords don't match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isPasswordValid || formData.password !== formData.confirmPassword}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
