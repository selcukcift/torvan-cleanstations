"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, User, Lock, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { signIn, getSession } from "next-auth/react"

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })
  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true)

    try {
      const result = await signIn('credentials', {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
        })
        return
      }

      // Get session to retrieve user info
      const session = await getSession()
      if (session?.user) {
        toast({
          variant: "success",
          title: "Login Successful",
          description: `Welcome back, ${session.user.name}!`,
        })

        // Redirect to dashboard
        router.push('/dashboard')
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
      })

      console.error('Login error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-600 text-base">
            Sign in to Torvan Medical CleanStation Workflow
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-xl font-semibold text-center text-slate-800">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              Enter your credentials to access the workflow system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700">
                        Username or Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Enter your username or email"
                            className="pl-10 h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            className="pl-10 h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-indigo-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
            </Form>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p>
                  Need access? Contact your system administrator to get credentials for the CleanStation workflow system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Torvan Medical CleanStation Production Workflow
          </p>
          <p className="text-xs text-slate-400 mt-1">
            ISO 13485:2016 Compliant Medical Device Management System
          </p>
        </div>
      </div>
    </div>
  )
}
