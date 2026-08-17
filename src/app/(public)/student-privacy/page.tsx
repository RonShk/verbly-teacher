import type { Metadata } from 'next'

import { LegalList, LegalSection, StudentLegalDocument } from '@/components/StudentLegalDocument'

export const metadata: Metadata = {
  title: 'Student Privacy Policy — Verbly',
  description: 'Verbly student application privacy policy.',
}

export default function StudentPrivacyPage() {
  return (
    <StudentLegalDocument title="Student Privacy Policy">
      <p>Verbly (&quot;Verbly,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a language-learning application that helps students practice vocabulary, translation, and sentence production (the &quot;App&quot; or &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and protect information when you use the Verbly student application.</p>

      <LegalSection title="1. Information We Collect">
        <h3 className="font-semibold">Account information</h3>
        <p>When you sign in with Google or Apple, we may receive:</p>
        <LegalList>
          <li>Name</li><li>Email address, including an Apple private relay email address</li><li>Profile photo, if provided by the sign-in provider</li><li>Authentication and account identifiers</li>
        </LegalList>
        <h3 className="font-semibold">Practice information</h3>
        <p>We collect information needed to provide the Service, including:</p>
        <LegalList>
          <li>Vocabulary cards and assignments</li><li>Practice answers and responses</li><li>Translation and sentence-production responses</li><li>Scores, corrections, feedback, and progress</li><li>Practice history and completion information</li><li>Learning language and timezone information</li>
        </LegalList>
        <p><strong>Information provided by teachers.</strong> A teacher or tutor may create assignments, vocabulary content, and practice activities for you. Teachers may be able to view information related to your assignments and progress.</p>
        <h3 className="font-semibold">Technical information</h3>
        <p>Firebase and other service providers may process technical information such as:</p>
        <LegalList>
          <li>Device and operating system information</li><li>App version</li><li>IP address and approximate location derived from IP address</li><li>Crash, security, and diagnostic information</li><li>Authentication and network logs</li>
        </LegalList>
        <p>We do not intentionally collect precise location, contacts, photographs, microphone recordings, or payment information through the student App.</p>
      </LegalSection>

      <LegalSection title="2. How We Use Information">
        <p>We use information to:</p>
        <LegalList>
          <li>Create and maintain your account</li><li>Authenticate you through Google or Apple</li><li>Provide vocabulary and language practice</li><li>Generate practice questions and feedback</li><li>Record scores and learning progress</li><li>Connect you with your teacher or tutor</li><li>Secure, troubleshoot, and improve the Service</li><li>Respond to support requests</li><li>Comply with legal obligations</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Artificial Intelligence">
        <p>Verbly uses artificial intelligence to generate practice questions, evaluate answers, provide corrections, and create explanations. Your practice responses and related assignment information may be sent to our AI service providers for processing. We use this information to provide the requested practice or feedback.</p>
        <p>Please do not submit sensitive personal information, passwords, financial information, medical information, or other information that is not necessary for language practice.</p>
        <p>AI-generated content may be inaccurate. Verbly does not guarantee that every correction, translation, explanation, or score is error-free.</p>
      </LegalSection>

      <LegalSection title="4. How We Share Information">
        <p>We do not sell personal information or use student information for targeted advertising.</p>
        <p>We may share information with service providers that help us operate Verbly, including:</p>
        <LegalList>
          <li>Google Firebase and Firestore for authentication, databases, hosting, and backend services</li><li>Google services used for Google Sign-In</li><li>Apple services used for Sign in with Apple</li><li>Google Gemini or other AI service providers used to generate practice content and feedback</li><li>Email providers used to send account or invitation messages</li><li>Hosting, security, and infrastructure providers</li>
        </LegalList>
        <p>These providers may process information only as necessary to provide services to Verbly. We may also disclose information when reasonably necessary to comply with law, protect rights or safety, prevent fraud or abuse, enforce our Terms, or complete a merger, acquisition, financing, or sale of assets.</p>
      </LegalSection>

      <LegalSection title="5. Teachers and Tutors">
        <p>If your account is connected to a teacher or tutor, that teacher or tutor may be able to view your assigned content, answers, scores, and learning progress. Teachers and tutors are responsible for using student information only for legitimate educational purposes and in accordance with applicable law.</p>
      </LegalSection>

      <LegalSection title="6. Children and Students Under 18">
        <p>Verbly may be used by students under the direction of a parent, guardian, school, teacher, or tutor. We do not knowingly allow children under 13 to independently create accounts without the consent or authorization required by applicable law.</p>
        <p>If Verbly is used by a school or educational organization, the school or organization may be responsible for obtaining any required parental consent and providing required notices. If you believe a child has provided personal information inappropriately, contact verblysupport@gmail.com.</p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <p>We retain information for as long as reasonably necessary to provide the Service, maintain learning progress, resolve disputes, enforce agreements, and comply with legal obligations.</p>
        <p>When an account is deleted, we will delete or de-identify associated personal information within a reasonable period, except where we are legally required to retain certain information.</p>
      </LegalSection>

      <LegalSection title="8. Your Choices and Rights">
        <p>Depending on your location, you may have rights to access personal information, correct inaccurate information, request deletion, request a copy of your information, object to or restrict certain processing, and withdraw consent where processing is based on consent.</p>
        <p>You may request deletion through the account deletion feature in the App or by contacting verblysupport@gmail.com. We may need to verify your identity before completing a request.</p>
      </LegalSection>

      <LegalSection title="9. Account Deletion">
        <p>You may delete your Verbly account from the App&apos;s profile or account settings. Deleting your account may permanently remove your profile, assignments, practice history, answers, scores, and progress. Deletion may not remove information that we are legally required to retain.</p>
      </LegalSection>

      <LegalSection title="10. Security">
        <p>We use reasonable administrative, technical, and organizational measures to protect information. However, no system is completely secure, and we cannot guarantee absolute security.</p>
      </LegalSection>

      <LegalSection title="11. International Processing">
        <p>Your information may be processed in countries other than the country where you live. We take reasonable steps to protect information when it is transferred or processed internationally.</p>
      </LegalSection>

      <LegalSection title="12. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will update the effective date when changes are made. If changes are material, we may provide additional notice where required by law.</p>
      </LegalSection>

      <LegalSection title="13. Contact Us">
        <p>Verbly is operated by Verbly.</p><p>Email: verblysupport@gmail.com</p><p>For business correspondence, please contact us by email.</p>
      </LegalSection>
    </StudentLegalDocument>
  )
}
