import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Aperture, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { supabase, supabaseConfigurationError } from "../lib/supabase";

export type AuthView = "login" | "signup" | "forgot" | "reset" | "setup";

interface AuthScreenProps {
  initialView?: AuthView;
  onViewChange?: (view: AuthView) => void;
}

export default function AuthScreen({ initialView = "login", onViewChange }: AuthScreenProps) {
  const [view, setViewState] = useState<AuthView>(initialView);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function changeView(next: AuthView) {
    setViewState(next);
    onViewChange?.(next);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    setMessage(null);

    if (view === "signup" && password !== confirmPassword) {
      setMessage({ kind: "error", text: "Those passwords don’t match yet." });
      return;
    }
    if (view === "reset" && password !== confirmPassword) {
      setMessage({ kind: "error", text: "Those passwords don’t match yet." });
      return;
    }
    if ((view === "signup" || view === "reset") && password.length < 10) {
      setMessage({ kind: "error", text: "Choose a password with at least 10 characters." });
      return;
    }

    setBusy(true);
    try {
      if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (data.session) return;
        changeView("login");
        setMessage({ kind: "success", text: "Your account is ready. Check your email to confirm your address, then sign in." });
      } else if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage({ kind: "success", text: "If an account exists for that email, a secure reset link is on its way." });
      } else if (view === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        changeView("login");
        setMessage({ kind: "success", text: "Your password has been updated. Sign in with your new password." });
      }
    } catch (error) {
      console.error("Authentication request failed.", error);
      setMessage({ kind: "error", text: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  const isSignup = view === "signup";
  const isForgot = view === "forgot";
  const isReset = view === "reset";
  const isSetup = view === "setup";
  const heading = isSetup ? "Your studio, ready to grow." : isSignup ? "Let’s make room for you." : isForgot ? "We’ll help you back in." : isReset ? "A fresh start." : "Welcome back.";
  const subheading = isSetup
    ? "Connect your private Supabase project to turn on secure accounts and cloud-synced ledgers."
    : isSignup ? "A calmer relationship with money starts right here."
      : isForgot ? "Enter the email linked to your studio and we’ll send a secure reset link."
        : isReset ? "Choose a strong new password for your Tiny Ledger account."
          : "Your work is waiting. Let’s see how it’s doing.";

  return <main className="auth-page">
    <div className="auth-ambient auth-ambient-one" /><div className="auth-ambient auth-ambient-two" />
    <a className="auth-brand" href="/" aria-label="Tiny Ledger home"><span className="brand-mark"><Aperture size={20} /></span><span className="brand-name">tiny<span>ledger</span></span></a>
    <div className="auth-layout">
      <motion.section className="auth-story" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .35 }}>
        <span className="auth-eyebrow"><span className="live-dot" /> A LITTLE MORE CLARITY, EVERY DAY</span>
        <h1>Make a living<br />doing <em>what you love.</em></h1>
        <p>Thoughtful tools for the business behind your beautiful work.</p>
        <div className="auth-photo-card"><div className="auth-photo-image" /><div className="auth-photo-caption"><span className="auth-photo-mark"><Aperture size={16} /></span><span><strong>Your studio, in balance.</strong><small>Money, in focus.</small></span></div></div>
        <div className="auth-trust"><ShieldCheck size={15} /><span>Your financial data is private to your account.</span></div>
      </motion.section>

      <motion.section className="auth-card" key={view} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
        <div className="auth-card-top"><span className="auth-card-icon">{isSetup ? <KeyRound size={19} /> : isReset ? <ShieldCheck size={19} /> : <Aperture size={19} />}</span><span className="auth-card-note">{isSetup ? "A ONE-TIME SETUP" : isReset ? "SECURE PASSWORD RESET" : "YOUR PHOTOGRAPHY BUSINESS, IN FOCUS"}</span></div>
        <h2>{heading}</h2><p className="auth-subheading">{subheading}</p>

        {isSetup ? <div className="setup-instructions">
          {supabaseConfigurationError && <div className="auth-message error" role="alert"><ShieldCheck size={16} />{supabaseConfigurationError}</div>}
          <div className="setup-step"><span>01</span><p>Create a Supabase project for your studio app.</p></div>
          <div className="setup-step"><span>02</span><p>Copy <code>.env.example</code> to <code>.env.local</code>, then add your project URL and publishable key.</p></div>
          <div className="setup-step"><span>03</span><p>Run both SQL files in <code>supabase/migrations/</code> in your Supabase SQL Editor to enable private ledgers and profile photos.</p></div>
          <div className="setup-security"><ShieldCheck size={16} /><span>Use only the public publishable key in your frontend. Never add a service-role key here.</span></div>
          <a className="button button-gold setup-doc-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase dashboard <ArrowRight size={15} /></a>
        </div> : <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
          {isSignup && <label className="auth-field"><span>Full name</span><div className="auth-input-wrap"><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" minLength={2} maxLength={100} required /><Aperture size={16} /></div></label>}
          {!isReset && <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourstudio.com" required /><Mail size={16} /></div></label>}
          {!isForgot && <label className="auth-field"><span>{isReset ? "New password" : "Password"}</span><div className="auth-input-wrap"><input type={showPassword ? "text" : "password"} autoComplete={isReset ? "new-password" : isSignup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isReset || isSignup ? "At least 10 characters" : "Your password"} minLength={isReset || isSignup ? 10 : 1} required /><button className="auth-reveal" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
          {(isSignup || isReset) && <label className="auth-field"><span>Confirm password</span><div className="auth-input-wrap"><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" minLength={10} required /><CheckCircle2 size={16} /></div></label>}
          {view === "login" && <button className="auth-forgot-link" type="button" onClick={() => changeView("forgot")}>Forgot password?</button>}
          {message && <div className={`auth-message ${message.kind}`} role="status">{message.kind === "success" ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}{message.text}</div>}
          <button className="button button-gold auth-submit" type="submit" disabled={busy}>
            {busy ? <span className="auth-spinner" /> : <>{isSignup ? "Create your account" : isForgot ? "Send reset link" : isReset ? "Save new password" : "Sign in"} <ArrowRight size={16} /></>}
          </button>
        </form>}

        {!isSetup && !isReset && <div className="auth-switch">{isForgot ? <button type="button" onClick={() => changeView("login")}><ArrowLeft size={14} /> Back to sign in</button> : isSignup ? <span>Already have an account? <button type="button" onClick={() => changeView("login")}>Sign in</button></span> : <span>New to Tiny Ledger? <button type="button" onClick={() => changeView("signup")}>Create an account</button></span>}</div>}
        {isReset && <div className="auth-switch"><span>Having trouble? <button type="button" onClick={() => changeView("forgot")}>Request a fresh link</button></span></div>}
        <div className="auth-privacy"><ShieldCheck size={13} /><span>Encrypted in transit. Private to your account.</span></div>
      </motion.section>
    </div>
    <footer className="auth-footer"><span>Made for the ones behind the lens.</span><span>Tiny Ledger <i>·</i> Your studio, in balance.</span></footer>
  </main>;
}

function authErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) return "That email and password don’t match. Please try again.";
  if (message.includes("user already registered")) return "An account with that email already exists. Try signing in instead.";
  if (message.includes("password should be at least")) return "Choose a password with at least 10 characters.";
  if (message.includes("email not confirmed")) return "Please confirm your email using the link we sent before signing in.";
  if (message.includes("rate limit") || message.includes("too many requests")) return "Too many attempts. Please wait a little and try again.";
  return error.message;
}
