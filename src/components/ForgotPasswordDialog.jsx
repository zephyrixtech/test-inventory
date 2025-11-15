import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export const ForgotPasswordDialog = ({ open, onOpenChange }) => {
    const [step, setStep] = useState(1);
    const [dialogLoading, setDialogLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [answer, setAnswer] = useState("");
    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [forgotPwdErrors, setForgotPwdErrors] = useState({});
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [isAccLocked, setIsAccLocked] = useState(false)

    const resetDialog = () => {
        setStep(1);
        setEmail("");
        setAnswer("");
        setPasswordData({ newPassword: "", confirmPassword: "" });
        setForgotPwdErrors({});
        setIsAccLocked(false);
        setSecurityQuestion('');
        setCorrectAnswer('');
    };

    const handleCancel = () => {
        resetDialog();
        onOpenChange(false);
    };

    const validateEmail = (value) => {
        const trimmedEmail = value.trim();
        if (!trimmedEmail) {
            return "Email is required";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return "Invalid email address";
        }
        return null;
    };

    const validatePassword = (password) => {
        if (!password) return "Password is required";
        if (password.length < 8) return "Password must be at least 8 characters";
        if (password.length > 100) return "Password must be less than 100 characters";
        if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
        if (!/\d/.test(password)) return "Password must contain at least one number";
        if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
        return true;
    };

    // Static "database"
    const staticUser = {
        email: "admin@example.com",
        security_question: "What is your favorite color?",
        secret_answer: "blue",
    };

    const handleVerifyEmail = async () => {
        setForgotPwdErrors({});
        const emailError = validateEmail(email);
        if (emailError) {
            setForgotPwdErrors({ email: emailError });
            return;
        }

        setDialogLoading(true);
        try {
            await new Promise((res) => setTimeout(res, 600));
            if (email.toLowerCase() !== staticUser.email) {
                setForgotPwdErrors({ email: "Account not found or invalid" });
                return;
            }
            setSecurityQuestion(staticUser.security_question);
            setCorrectAnswer(staticUser.secret_answer);
            setStep(2);
        } catch (err) {
            setForgotPwdErrors({ email: "Failed to verify. Try again." });
        } finally {
            setDialogLoading(false);
        }
    };

    const handleVerifyAnswer = async () => {
        setForgotPwdErrors({});
        if (!answer.trim()) {
            setForgotPwdErrors({ answer: "Answer is required" });
            return;
        }
        setDialogLoading(true);
        try {
            await new Promise((res) => setTimeout(res, 600));
            const isCorrect = correctAnswer?.toLowerCase().trim() === answer.toLowerCase().trim();
            if (isCorrect) {
                setStep(3);
            } else {
                setForgotPwdErrors({ answer: "Incorrect answer." });
            }
        } catch {
            setForgotPwdErrors({ answer: "Something went wrong. Try again." });
        } finally {
            setDialogLoading(false);
        }
    };

    const handleConfirmPassword = async () => {
        const { newPassword, confirmPassword } = passwordData;
        setForgotPwdErrors({});

        if (!newPassword || !confirmPassword) {
            setForgotPwdErrors({ password: "Both fields are required" });
            return;
        }

        if (newPassword !== confirmPassword) {
            setForgotPwdErrors({ password: "Passwords do not match" });
            return;
        }

        const validation = validatePassword(newPassword);
        if (validation !== true) {
            setForgotPwdErrors({ password: validation });
            return;
        }

        setDialogLoading(true);
        try {
            await new Promise((res) => setTimeout(res, 700));
            toast.success("Password reset successful");
            resetDialog();
            onOpenChange(false);
        } catch {
            setForgotPwdErrors({ password: "Failed to reset password. Try again." });
        } finally {
            setDialogLoading(false);
        }
    };

    const buttonConfig = {
        1: { handler: handleVerifyEmail, label: "Next", loadingText: "Processing..." },
        2: { handler: handleVerifyAnswer, label: "Next", loadingText: "Checking..." },
        3: { handler: handleConfirmPassword, label: "Confirm", loadingText: "Submitting..." },
    }[step];

    const handleOpenChange = (open) => {
        if (open) {
            onOpenChange(true);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto bg-white backdrop-blur-lg shadow-2xl rounded-2xl p-8 sm:p-12 w-full max-w-md transition-all duration-300">
                <DialogHeader>
                    <DialogTitle className="text-blue-600 flex items-center gap-2 text-2xl font-bold">
                        <Lock className="h-6 w-6" />
                        Forgot Password
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2">
                        {step === 1 && "Enter your registered email to verify your account."}
                        {step === 2 && "Answer the security question to continue."}
                        {step === 3 && "Set your new password below."}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-2 mt-6">
                        <Label
                            htmlFor="email"
                            className={cn("font-medium", forgotPwdErrors.email && "text-destructive")}
                        >
                            Registered Email ID <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-500" />
                            <Input
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className={cn(
                                    "pl-10 h-12 rounded-lg transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20",
                                    forgotPwdErrors.email && "border-destructive focus-visible:ring-destructive"
                                )}
                            />
                        </div>
                        {forgotPwdErrors.email && (
                            <p className="text-sm text-destructive mt-1 animate-slideDown">{forgotPwdErrors.email}</p>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-2 mt-6">
                        <Label
                            htmlFor="security_question"
                            className={cn("font-medium", forgotPwdErrors.answer && "text-destructive")}
                        >
                            {securityQuestion} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-3 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-500" />
                            <Input
                                id="security_question"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Enter your answer"
                                className={cn(
                                    "pl-10 h-12 rounded-lg transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20",
                                    forgotPwdErrors.answer && "border-destructive focus-visible:ring-destructive"
                                )}
                            />
                        </div>
                        {forgotPwdErrors.answer && (
                            <p className="text-sm text-destructive mt-1 animate-slideDown">{forgotPwdErrors.answer}</p>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 mt-6">
                        <div className="space-y-2">
                            <Label
                                htmlFor="new_password"
                                className={cn("font-medium", forgotPwdErrors.password && "text-destructive")}
                            >
                                New Password <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-500" />
                                <Input
                                    id="new_password"
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) =>
                                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                                    }
                                    placeholder="Enter new password"
                                    className={cn(
                                        "pl-10 h-12 rounded-lg transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20",
                                        forgotPwdErrors.password && "border-destructive focus-visible:ring-destructive"
                                    )}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="confirm_password"
                                className={cn("font-medium", forgotPwdErrors.password && "text-destructive")}
                            >
                                Confirm Password <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-500" />
                                <Input
                                    id="confirm_password"
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) =>
                                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                    }
                                    placeholder="Confirm new password"
                                    className={cn(
                                        "pl-10 h-12 rounded-lg transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20",
                                        forgotPwdErrors.password && "border-destructive focus-visible:ring-destructive"
                                    )}
                                />
                            </div>
                            {forgotPwdErrors.password && (
                                <p className="text-sm text-destructive mt-1 animate-slideDown">{forgotPwdErrors.password}</p>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="flex justify-between items-center mt-8">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={dialogLoading}
                        >
                            Cancel
                        </Button>
                    </DialogClose>

                    <Button
                        onClick={buttonConfig.handler}
                        disabled={dialogLoading || isAccLocked}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {dialogLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> {buttonConfig.loadingText}
                            </span>
                        ) : (
                            buttonConfig.label
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


