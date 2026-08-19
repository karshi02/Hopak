import { PageLoader } from '@/components/PageLoader';
import { RouteSkeleton } from '@/components/RouteSkeleton';

// PageLoader = จอแบรนด์ (เข้าเว็บครั้งแรกของ session เท่านั้น)
// RouteSkeleton = โครงหน้าจำลองตอนสลับหน้าไปมา Next ถอดออกเองเมื่อหน้าปลายทางพร้อม
export default function Loading() {
  return (
    <>
      <RouteSkeleton variant="auth" />
      <PageLoader />
    </>
  );
}
