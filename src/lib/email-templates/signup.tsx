import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="bn" dir="ltr">
    <Head />
    <Preview>{siteName}-এ আপনার ইমেইল যাচাই করুন</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>নাগরিক বার্তা ২৪</Text>
          <Text style={tagline}>Nagarik Barta 24 — নাগরিকের কণ্ঠস্বর</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>ইমেইল যাচাই করুন</Heading>
          <Text style={text}>
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>{' '}
            এ সাইন আপ করার জন্য ধন্যবাদ!
          </Text>
          <Text style={text}>
            নিচের বোতামে ক্লিক করে আপনার ইমেইল ঠিকানা (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ) নিশ্চিত করুন।
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={confirmationUrl}>
              ইমেইল যাচাই করুন
            </Button>
          </Section>
          <Text style={smallText}>
            বোতাম কাজ না করলে এই লিঙ্কটি কপি করে ব্রাউজারে খুলুন:
          </Text>
          <Text style={linkFallback}>{confirmationUrl}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          আপনি যদি এই অ্যাকাউন্ট তৈরি না করে থাকেন, এই ইমেইলটি উপেক্ষা করতে পারেন।
        </Text>
        <Text style={footerBrand}>© নাগরিক বার্তা ২৪ · nagarikbarta24.com</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const header = {
  backgroundColor: '#1e3a5f',
  padding: '24px 20px',
  borderRadius: '10px 10px 0 0',
  textAlign: 'center' as const,
}
const brand = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  margin: '0',
  letterSpacing: '0.3px',
}
const tagline = {
  color: '#cfe1f2',
  fontSize: '12px',
  margin: '4px 0 0',
}
const card = {
  border: '1px solid #e2e8f0',
  borderTop: 'none',
  borderRadius: '0 0 10px 10px',
  padding: '24px 22px',
  backgroundColor: '#ffffff',
}
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 14px',
}
const smallText = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '18px 0 6px',
}
const linkFallback = {
  fontSize: '12px',
  color: '#1e3a5f',
  wordBreak: 'break-all' as const,
  margin: '0',
}
const link = { color: '#00843D', textDecoration: 'underline' }
const button = {
  backgroundColor: '#00843D',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '13px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const footerBrand = { fontSize: '11px', color: '#94a3b8', margin: '0' }
