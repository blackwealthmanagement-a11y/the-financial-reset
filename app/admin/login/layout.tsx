import { Suspense } from 'react';
import Loading from './loading';
import LoginPage from './page';

export default function AdminLoginLayout() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginPage />
    </Suspense>
  );
}
