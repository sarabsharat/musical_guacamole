// // src/components/auth/signup-auditor-form.tsx
// "use client";
//
// import { useState } from "react";
// import { signIn } from "next-auth/react";
// import { registerUser } from "@/actions/AuthActions";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
//
// export function SignupAuditorForm() {
//     const [phoneNumber, setPhoneNumber] = useState("");
//     const [password, setPassword] = useState("");
//     const [confirmPassword, setConfirmPassword] = useState("");
//     const [fullName, setFullName] = useState("");
//     const [certId, setCertId] = useState("");
//     const [error, setError] = useState("");
//     const [isLoading, setIsLoading] = useState(false);
//
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setError("");
//         setIsLoading(true);
//
//         if (password !== confirmPassword) {
//             setError("Passwords do not match!");
//             setIsLoading(false);
//             return;
//         }
//
//         const res = await registerUser(undefined, {
//             phone_number: phoneNumber,
//             password,
//             full_name: fullName,
//             cert_id: certId,
//             role: "nutritionist_auditor",
//         });
//
//         if (res.success) {
//             // Log in using the phone number
//             const loginRes = await signIn("credentials", {
//                 phone_number: phoneNumber,
//                 password,
//                 redirect: false
//             });
//
//             if (loginRes?.ok) {
//                 window.location.href = "/onboarding/auditor";
//             } else {
//                 setError("Registration succeeded. Please log in manually.");
//                 setIsLoading(false);
//             }
//         } else {
//             setError(res.message);
//             setIsLoading(false);
//         }
//     };
//
//     return (
//         <Card className="mx-auto w-full max-w-md">
//             <CardHeader className="relative">
//                 <Link href="/signup" className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
//                     <ArrowLeft className="h-4 w-4" />
//                 </Link>
//                 <CardTitle className="text-center pt-4">Auditor Registration</CardTitle>
//                 <CardDescription className="text-center">Independent Review Access</CardDescription>
//             </CardHeader>
//             <CardContent>
//                 {error && (
//                     <Alert variant="destructive" className="mb-4">
//                         <AlertCircle className="h-4 w-4" />
//                         <AlertDescription>{error}</AlertDescription>
//                     </Alert>
//                 )}
//                 <form onSubmit={handleSubmit} className="grid gap-4">
//                     <div className="grid gap-2">
//                         <Label htmlFor="full-name">Full Name</Label>
//                         <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
//                     </div>
//
//                     <div className="grid gap-2">
//                         <Label htmlFor="cert-id">Certification ID</Label>
//                         <Input
//                             id="cert-id"
//                             placeholder="AUD-XXXX"
//                             value={certId}
//                             onChange={(e) => setCertId(e.target.value)}
//                             required
//                         />
//                     </div>
//
//                     <div className="grid gap-2">
//                         <Label htmlFor="phone-number">Mobile Number</Label>
//                         <Input
//                             id="phone-number"
//                             type="tel"
//                             placeholder="07X XXX XXXX"
//                             value={phoneNumber}
//                             onChange={(e) => setPhoneNumber(e.target.value)}
//                             required
//                         />
//                     </div>
//
//                     <div className="grid gap-2">
//                         <Label htmlFor="password">Password</Label>
//                         <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
//                     </div>
//                     <div className="grid gap-2">
//                         <Label htmlFor="confirm-password">Confirm Password</Label>
//                         <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
//                     </div>
//
//                     <Button type="submit" className="w-full mt-2" disabled={isLoading}>
//                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//                         Register as Auditor
//                     </Button>
//                 </form>
//             </CardContent>
//         </Card>
//     );
// }