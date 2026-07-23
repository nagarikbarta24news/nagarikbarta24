import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  subject?: string
  message?: string
  submittedAt?: string
}

const ContactMessage = ({
  name = 'Anonymous',
  email = 'unknown',
  subject = '(no subject)',
  message = '',
  submittedAt,
}: Props) => (
  <Html lang="bn" dir="ltr">
    <Head />
    <Preview>নতুন যোগাযোগ বার্তা — {subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>নাগরিক বার্তা ২৪ — নতুন যোগাযোগ বার্তা</Heading>

        <Section style={card}>
          <Text style={label}>প্রেরকের নাম</Text>
          <Text style={value}>{name}</Text>

          <Text style={label}>ইমেইল</Text>
          <Text style={value}>{email}</Text>

          <Text style={label}>বিষয়</Text>
          <Text style={value}>{subject}</Text>

          {submittedAt ? (
            <>
              <Text style={label}>জমা দেওয়া হয়েছে</Text>
              <Text style={value}>{submittedAt}</Text>
            </>
          ) : null}
        </Section>

        <Hr style={hr} />

        <Text style={label}>বার্তা</Text>
        <Text style={messageStyle}>{message}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactMessage,
  subject: (data: Record<string, any>) =>
    `যোগাযোগ ফর্ম: ${data?.subject || '(no subject)'}`,
  displayName: 'Contact form message',
  to: 'info@nagarikbarta24.com',
  previewData: {
    name: 'জাহিদ হাসান',
    email: 'sender@example.com',
    subject: 'ওয়েবসাইট সংক্রান্ত জিজ্ঞাসা',
    message: 'হ্যালো, আমি আপনাদের পোর্টাল সম্পর্কে জানতে চাই।',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '20px', color: '#1e3a5f', marginBottom: '16px' }
const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 20px',
}
const label = {
  fontSize: '12px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  marginBottom: '2px',
  marginTop: '10px',
}
const value = { fontSize: '15px', color: '#0f172a', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const messageStyle = {
  fontSize: '15px',
  color: '#0f172a',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
}
