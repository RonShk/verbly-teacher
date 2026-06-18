import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — Verbly",
}

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <strong className="text-foreground">Effective date:</strong> June 18, 2026
      </p>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          These Terms of Service ("Terms") govern your access to and use of the Verbly teacher
          dashboard web application (the "Service"), operated by Verbly ("Verbly," "we," "us," or
          "our"). By accessing or using the Service, you agree to be bound by these Terms. If you do
          not agree, do not use the Service.
        </p>
        <p>
          These Terms apply only to the Verbly teacher dashboard web application used by teachers
          and tutors. The separate Verbly mobile application used by students is governed by its own
          terms.
        </p>
      </div>

      <div className="mt-10 space-y-10">

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">1. Eligibility</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service is intended only for teachers and tutors. By using the Service, you
            represent and warrant that you are at least <strong>18 years old</strong> and able to
            enter into a binding agreement. The Service is not intended for, and may not be used by,
            anyone under 18.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">2. The Service</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Verbly is a platform that allows tutors and teachers to connect with their existing
            students and assign them vocabulary content in a learning language. Through the web
            dashboard, you can view your connected students, review and assess student progress,
            create and import vocabulary content, and use the "ask Verbly" AI chat feature. We may
            add, change, or remove features at any time.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service is currently provided free of charge. We reserve the right to introduce fees
            in the future, with notice.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">3. Accounts</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            You sign in to the Service using Google Single Sign-On. You are responsible for all
            activity that occurs under your account. To keep your account secure:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              You <strong>may not share</strong> your account or login credentials with anyone else;
            </li>
            <li>You must keep your Google account credentials secure;</li>
            <li>You must promptly notify us of any unauthorized use of your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">4. Acceptable use</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            You agree to use the Service only for its intended purpose. You <strong>may not</strong>:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            <li>Share your account, credentials, or access with any other person;</li>
            <li>
              Use the Service, or any of its tools or features, for any purpose other than its
              original, intended use case;
            </li>
            <li>
              Scrape, harvest, copy, or extract data from the Service by automated or manual means;
            </li>
            <li>
              Use student data obtained through the Service for any malicious, harmful, unlawful, or
              unauthorized purpose;
            </li>
            <li>
              Attempt to gain unauthorized access to the Service, other accounts, or our systems;
            </li>
            <li>
              Interfere with, disrupt, reverse engineer, or attempt to compromise the Service or its
              security;
            </li>
            <li>Use the Service in any way that violates applicable law.</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We may suspend or terminate your access if you violate these rules.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            5. Student data and your responsibilities
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            As a teacher or tutor, you may view student information and progress through the
            dashboard, and you may enter a student&apos;s email address to send an invitation to the
            Verbly mobile application. You are responsible for handling all student information you
            access or provide through the Service lawfully, ethically, and only for legitimate
            educational purposes. You represent that you have any necessary rights or permissions to
            provide a student&apos;s email address to us for the purpose of sending an invitation.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            6. The "ask Verbly" AI feature and content license
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service includes "ask Verbly," an AI chat feature. By using this feature, you grant
            Verbly a perpetual, worldwide, royalty-free license to use, store, reproduce, and
            process the content of your "ask Verbly" conversations — including your messages and the
            model&apos;s responses — to operate, improve, and refine our language model and the
            quality of its responses. As described in our Privacy Policy, any student-related
            information contained in these conversations is de-identified and is not used to
            identify or profile an individual student.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">7. Your other content</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Content you create within the Service that is not part of the "ask Verbly" chat — for
            example, vocabulary cards you create or import — remains yours. We do not use that
            content for any purpose other than providing the Service to you. You are responsible for
            ensuring you have the right to upload or create any content you add to the Service.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            8. Intellectual property
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service, including its software, design, branding, and all related intellectual
            property, is owned by Verbly and is protected by applicable laws. These Terms do not
            grant you any ownership rights in the Service. You may not copy, modify, distribute, or
            create derivative works from the Service except as expressly permitted.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">9. Termination</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            You may stop using the Service at any time and may request deletion of your account by
            emailing us. We may suspend or terminate your access to the Service at any time, with or
            without notice, if you violate these Terms or if we discontinue the Service. Provisions
            that by their nature should survive termination — including content licenses,
            intellectual property, disclaimers, and limitations of liability — will survive.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            10. Disclaimer of warranties
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service is provided on an "as is" and "as available" basis, without warranties of
            any kind, whether express or implied, including but not limited to warranties of
            merchantability, fitness for a particular purpose, and non-infringement. We do not
            warrant that the Service will be uninterrupted, error-free, secure, or that any content
            or AI-generated output will be accurate or reliable.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            11. Limitation of liability
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            To the fullest extent permitted by law, Verbly will not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or for any loss of data, use,
            or profits, arising out of or related to your use of (or inability to use) the Service.
            To the fullest extent permitted by law, our total liability for any claim relating to
            the Service will not exceed one hundred U.S. dollars ($100).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">12. Indemnification</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            You agree to indemnify and hold harmless Verbly from any claims, damages, losses, or
            expenses (including reasonable legal fees) arising out of your use of the Service, your
            violation of these Terms, or your misuse of any data accessed through the Service.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">13. Governing law</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            These Terms are governed by the laws of the State of Texas, United States, without
            regard to its conflict-of-laws principles. You agree that any dispute arising out of or
            relating to these Terms or the Service will be brought exclusively in the state or
            federal courts located in Texas, and you consent to the jurisdiction of those courts.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            14. Changes to these Terms
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We may update these Terms from time to time. When we do, we will revise the effective
            date at the top of this page. Your continued use of the Service after an update means
            you accept the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">15. Contact us</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            If you have questions about these Terms, contact us at:
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            <strong>Email:</strong>{" "}
            <a
              href="mailto:verblysupport@gmail.com"
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              verblysupport@gmail.com
            </a>
          </p>
        </section>

      </div>
    </div>
  )
}
