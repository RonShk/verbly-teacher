import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Verbly",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <strong className="text-foreground">Effective date:</strong> June 18, 2026
      </p>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          This Privacy Policy explains how Verbly ("Verbly," "we," "us," or "our") collects, uses,
          and protects information when you use the Verbly teacher dashboard web application (the
          "Service"). By using the Service, you agree to the practices described in this policy.
        </p>
        <p>
          This policy applies only to the Verbly teacher dashboard web application used by teachers
          and tutors. It does not cover the separate Verbly mobile application used by students,
          which is governed by its own terms and policies.
        </p>
      </div>

      <div className="mt-10 space-y-10">

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">1. Who can use Verbly</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service is intended only for teachers and tutors who are 18 years of age or older.
            The Service is not directed to children, and we do not knowingly allow anyone under 18
            to create an account or use the Service. See the Children&apos;s Privacy section below.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">2. Information we collect</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We collect a limited amount of information needed to operate the Service:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              <strong>Account information.</strong> When you create an account, you sign in using
              Google Single Sign-On (SSO). During this process we receive and store your{" "}
              <strong>name</strong> and <strong>email address</strong> in our database (Google
              Firestore).
            </li>
            <li>
              <strong>Profile picture.</strong> Your Google profile picture is displayed in the
              navigation menu while you are signed in. This image is fetched in real time from your
              active Google authentication session and is <strong>not stored</strong> by us.
            </li>
            <li>
              <strong>Student email addresses you provide.</strong> To connect with a student, you
              may enter a student&apos;s email address so that we can send an email invitation to
              join the Verbly mobile application. This is the only situation in which new personal
              information about a student is entered through the web application.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We do not collect payment information, and we do not use cookies or third-party
            analytics tools at this time. We use Firebase to maintain your signed-in session.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">3. How we use information</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We use the information we collect to:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            <li>Create and maintain your account and keep you signed in;</li>
            <li>Display your dashboard, your connected students, and student progress;</li>
            <li>Allow you to create, import, and assign vocabulary content;</li>
            <li>Send student invitations on your behalf using the email address you provide;</li>
            <li>Operate, maintain, secure, and improve the Service;</li>
            <li>Respond to your support requests and communicate with you about the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">4. The "ask Verbly" AI feature</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Service includes an "ask Verbly" feature, an AI chat that consists of your typed
            messages and responses from our language model. We may use these conversations to
            improve and refine the quality and responsiveness of the model&apos;s replies.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            If a conversation contains information related to a student (for example, when you ask
            for suggestions to help a student who is struggling), that student-related information
            is <strong>de-identified</strong> and is <strong>not</strong> linked to a student&apos;s
            name or personal identity, and is <strong>not</strong> used to build a profile of any
            individual student. Our purpose is to improve how the model responds to teachers, not
            to learn or store specific students&apos; personal data.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">5. How we share information</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We do <strong>not</strong> sell your personal information, and we do{" "}
            <strong>not</strong> share it for advertising purposes.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We rely on the following third-party service providers ("subprocessors") to operate the
            Service. These providers process information only to provide their services to us:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            <li><strong>Google</strong> — authentication via Google Single Sign-On.</li>
            <li><strong>Firebase / Google Firestore</strong> — account database and session management.</li>
            <li><strong>Vercel</strong> — application hosting.</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We may also disclose information if required by law, to comply with legal process, or
            to protect the rights, safety, or property of Verbly, our users, or others.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">6. Data retention</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We retain your account information for as long as your account is active. If you
            request deletion of your account and data by emailing us (see Contact below), we will
            delete your personal information within <strong>30 days</strong> of receiving and
            verifying your request, except where we are required to retain it to comply with a
            legal obligation.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">7. Your privacy rights</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Depending on your location, you may have rights regarding your personal data. If you
            are a Texas resident, the Texas Data Privacy and Security Act (TDPSA) gives you the
            right to:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            <li>Confirm whether we are processing your personal data and access that data;</li>
            <li>Correct inaccuracies in your personal data;</li>
            <li>Delete personal data you provided to us or that we obtained about you;</li>
            <li>Obtain a portable copy of your personal data.</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Because we do not sell personal data, engage in targeted advertising, or carry out
            profiling that produces legal or similarly significant effects, the related opt-out
            rights do not currently apply to the Service.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            To exercise any of these rights, email us at{" "}
            <strong>verblysupport@gmail.com</strong>. We will respond within the time required by
            applicable law. If we decline your request, you may appeal our decision by replying to
            our response, and we will inform you in writing of the outcome of your appeal.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">8. Data security</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We use Google&apos;s authentication infrastructure and Firebase to help protect your
            information. While we take reasonable measures to safeguard your data, no method of
            transmission or storage is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">9. Children&apos;s privacy</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            The Verbly web application is intended only for teachers and tutors who are 18 or
            older. It is not directed to children, and we do not knowingly collect personal
            information from anyone under 18 through the Service. If you believe a person under 18
            has provided us personal information through the web application, please contact us so
            we can delete it.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            Note that student email addresses entered by a teacher are used solely to send an
            invitation to the separate Verbly mobile application; any collection or processing of
            student information within that mobile application is governed by its own separate terms
            and policies.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">10. Changes to this policy</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            We may update this Privacy Policy from time to time. When we do, we will revise the
            effective date at the top of this page. Your continued use of the Service after an
            update means you accept the revised policy.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">11. Contact us</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            If you have questions about this Privacy Policy or your personal information, contact
            us at:
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
