import type { Metadata } from 'next'

import { LegalList, LegalSection, StudentLegalDocument } from '@/components/StudentLegalDocument'

export const metadata: Metadata = {
  title: 'Student Terms of Service — Verbly',
  description: 'Verbly student application terms of service.',
}

export default function StudentTermsPage() {
  return (
    <StudentLegalDocument title="Student Terms of Service">
      <p>These Terms of Service (&quot;Terms&quot;) govern your use of the Verbly student application and related services (the &quot;App&quot; or &quot;Service&quot;).</p>
      <p>By using Verbly, you agree to these Terms. If you are under the age required to agree to contracts in your location, your parent, guardian, school, teacher, or tutor must authorize your use of the Service.</p>

      <LegalSection title="1. The Verbly Service">
        <p>Verbly provides language-learning tools, including:</p>
        <LegalList><li>Vocabulary practice</li><li>Translation practice</li><li>Sentence-production practice</li><li>AI-generated questions and explanations</li><li>Scores, corrections, and learning progress</li><li>Teacher-created assignments and content</li></LegalList>
        <p>Verbly is an educational practice tool. It is not a substitute for a qualified teacher, instructor, translator, or professional adviser.</p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <p>You may sign in using Google or Apple. You are responsible for keeping your account secure and for activity that occurs through your account.</p>
        <p>You may not:</p>
        <LegalList><li>Share your account with another person</li><li>Use another person&apos;s account</li><li>Provide false information</li><li>Circumvent account or security controls</li><li>Use the Service for unlawful purposes</li></LegalList>
      </LegalSection>

      <LegalSection title="3. Teacher Assignments">
        <p>Teachers and tutors may create assignments and connect students to the Service. You may only access assignments and information associated with your own account. You may not attempt to access another student&apos;s assignments, answers, scores, or account information.</p>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>You agree not to:</p>
        <LegalList><li>Abuse, disrupt, or interfere with the Service</li><li>Attempt unauthorized access</li><li>Reverse engineer or copy the App</li><li>Scrape or extract data from the Service</li><li>Upload malicious code</li><li>Submit passwords, financial information, or unnecessary sensitive information</li><li>Use Verbly to harass, threaten, discriminate against, or harm another person</li><li>Use the Service in violation of applicable law</li></LegalList>
      </LegalSection>

      <LegalSection title="5. Artificial Intelligence">
        <p>Verbly uses artificial intelligence to generate language-learning questions, corrections, explanations, and feedback. AI output may be incomplete, inaccurate, or inappropriate for a particular context. You should review AI-generated content with a teacher or qualified person when accuracy matters.</p>
        <p>You should not rely on Verbly for medical, legal, financial, safety, or other professional advice.</p>
        <p>By submitting practice content, you authorize Verbly to process that content as reasonably necessary to provide AI-generated practice and feedback.</p>
      </LegalSection>

      <LegalSection title="6. Your Content">
        <p>You retain ownership of content that you submit to Verbly, subject to the rights necessary for Verbly to operate the Service.</p>
        <p>You grant Verbly a limited, worldwide, non-exclusive license to host, store, reproduce, modify as technically necessary, and process your submitted content solely to provide, secure, and improve the Service.</p>
        <p>You represent that you have the right to submit the content and that doing so does not violate another person&apos;s rights or any applicable law.</p>
      </LegalSection>

      <LegalSection title="7. Verbly&apos;s Property">
        <p>The Verbly App, software, design, branding, logos, text, and other materials provided by Verbly are owned by or licensed to Verbly. These Terms do not give you ownership of Verbly&apos;s intellectual property.</p>
      </LegalSection>

      <LegalSection title="8. Third-Party Services">
        <p>Verbly relies on third-party services, including Google, Apple, Firebase, Firestore, hosting providers, email providers, and AI providers. Those services may have their own terms and privacy policies. Verbly is not responsible for third-party services that it does not control.</p>
      </LegalSection>

      <LegalSection title="9. Account Deletion">
        <p>You may delete your account through the App&apos;s account settings. Deletion may permanently remove your assignments, practice history, answers, scores, and progress. Deletion may not remove information that we are legally required to retain.</p>
      </LegalSection>

      <LegalSection title="10. Suspension and Termination">
        <p>You may stop using Verbly at any time. We may suspend or terminate access if you violate these Terms, create a security risk, misuse the Service, or if we discontinue the Service.</p>
      </LegalSection>

      <LegalSection title="11. Disclaimer">
        <p>The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent permitted by law, Verbly does not guarantee that the Service will always be available, be error-free, produce accurate AI-generated content, provide correct scores or corrections, or produce a particular learning outcome.</p>
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <p>To the maximum extent permitted by law, Verbly will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Nothing in these Terms excludes liability that cannot legally be excluded or limited.</p>
      </LegalSection>

      <LegalSection title="13. Changes to These Terms">
        <p>We may update these Terms from time to time. We will update the effective date when changes are made. If changes are material, we may provide additional notice where required by law.</p>
      </LegalSection>

      <LegalSection title="14. Governing Law">
        <p>These Terms are governed by the laws applicable in the jurisdiction where Verbly is operated, except where applicable law requires otherwise.</p>
      </LegalSection>

      <LegalSection title="15. Contact Us">
        <p>Verbly is operated by Verbly.</p><p>Email: verblysupport@gmail.com</p><p>For business correspondence, please contact us by email.</p>
      </LegalSection>
    </StudentLegalDocument>
  )
}
