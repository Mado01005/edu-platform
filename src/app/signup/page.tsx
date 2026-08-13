import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect('/lms/login?mode=signup');
}
